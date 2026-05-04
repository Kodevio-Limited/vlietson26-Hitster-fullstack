import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getSpotifyAuthUrl(): string {
    const clientId = this.configService.get('spotify.clientId');
    const redirectUri = this.configService.get('spotify.redirectUri');
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-modify-playback-state',
      'user-read-playback-state',
      'user-read-currently-playing',
    ].join(' ');

    return `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
      scopes,
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  async spotifyLogin(authCode: string): Promise<{ jwtToken: string; user: Partial<User> }> {
    // Exchange auth code for Spotify tokens
    const spotifyTokens = await this.exchangeSpotifyCode(authCode);
    
    // Get Spotify user info
    const spotifyUser = await this.getSpotifyUser(spotifyTokens.access_token);
    
    // Find or create user in database
    let user = await this.userRepository.findOne({
      where: { spotifyId: spotifyUser.id },
    });

    if (!user) {
      // Check if this email is an admin
      const isAdmin = this.isAdminEmail(spotifyUser.email);
      
      user = this.userRepository.create({
        email: spotifyUser.email,
        spotifyId: spotifyUser.id,
        displayName: spotifyUser.display_name,
        role: isAdmin ? 'admin' : 'user',
        spotifyAccessToken: spotifyTokens.access_token,
        spotifyRefreshToken: spotifyTokens.refresh_token,
        spotifyTokenExpiresAt: new Date(Date.now() + spotifyTokens.expires_in * 1000),
        hasPremium: spotifyUser.product === 'premium',
        lastLoginAt: new Date(),
      });
    } else {
      // Update existing user's tokens
      user.spotifyAccessToken = spotifyTokens.access_token;
      user.spotifyRefreshToken = spotifyTokens.refresh_token;
      user.spotifyTokenExpiresAt = new Date(Date.now() + spotifyTokens.expires_in * 1000);
      user.hasPremium = spotifyUser.product === 'premium';
      user.lastLoginAt = new Date();
    }
    
    await this.userRepository.save(user);
    
    // Generate JWT token
    const jwtToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      spotifyId: user.spotifyId,
    });
    
    // Return JWT and user info (excluding sensitive tokens)
    const { spotifyAccessToken, spotifyRefreshToken, ...safeUser } = user;
    return { jwtToken, user: safeUser };
  }

  private async exchangeSpotifyCode(code: string): Promise<any> {
    const auth = Buffer.from(
      `${this.configService.get('spotify.clientId')}:${this.configService.get('spotify.clientSecret')}`,
    ).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://accounts.spotify.com/api/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.configService.get<string>('spotify.redirectUri')!,
          }).toString(),
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );
      
      return response.data;
    } catch (error) {
      const err = error as any;
      console.error('Spotify token exchange error:', err.response?.data || err.message);
      throw new UnauthorizedException('Failed to authenticate with Spotify');
    }
  }

  private async getSpotifyUser(accessToken: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      );
      return response.data;
    } catch (error) {
      throw new UnauthorizedException('Failed to get Spotify user info');
    }
  }

  private isAdminEmail(email: string): boolean {
    const adminEmails = [
      'vandervliet.rick@gmail.com',
      'admin@bouwradio.com',
      'omgevingsverbinder@gmail.com',
    ];
    return adminEmails.includes(email);
  }

  async refreshSpotifyToken(userId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.spotifyRefreshToken) {
      throw new UnauthorizedException('No refresh token available');
    }

    const auth = Buffer.from(
      `${this.configService.get('spotify.clientId')}:${this.configService.get('spotify.clientSecret')}`,
    ).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://accounts.spotify.com/api/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: user.spotifyRefreshToken,
          }).toString(),
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      user.spotifyAccessToken = response.data.access_token;
      user.spotifyTokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
      if (response.data.refresh_token) {
        user.spotifyRefreshToken = response.data.refresh_token;
      }
      await this.userRepository.save(user);

      return response.data.access_token;
    } catch (error) {
      throw new UnauthorizedException('Failed to refresh Spotify token');
    }
  }

  async login(loginDto: LoginDto): Promise<{ jwtToken: string; user: Partial<User> }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      spotifyId: user.spotifyId,
    });

    const { password, spotifyAccessToken, spotifyRefreshToken, ...safeUser } = user;
    return { jwtToken, user: safeUser };
  }

  async register(registerDto: RegisterDto): Promise<{ jwtToken: string; user: Partial<User> }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const isAdmin = this.isAdminEmail(registerDto.email);

    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      displayName: registerDto.displayName || registerDto.email.split('@')[0],
      role: isAdmin ? 'admin' : 'user',
      lastLoginAt: new Date(),
    });

    await this.userRepository.save(user);

    const jwtToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      spotifyId: user.spotifyId,
    });

    const { password, spotifyAccessToken, spotifyRefreshToken, ...safeUser } = user;
    return { jwtToken, user: safeUser };
  }

  async forgotPassword(email: string): Promise<{ message: string; otp?: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // For security, don't reveal if user exists
      return { message: 'If an account with that email exists, we have sent a verification code.' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = otp;
    await this.userRepository.save(user);

    // Send real email
    await this.mailService.sendVerificationCode(email, otp);

    return { 
      message: 'Verification code sent to your email.',
      otp: process.env.NODE_ENV === 'development' ? otp : undefined 
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ token: string }> {
    const user = await this.userRepository.findOne({
      where: { email: verifyOtpDto.email, verificationCode: verifyOtpDto.code },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate a temporary reset token
    const resetToken = Math.random().toString(36).substring(2, 15);
    user.resetToken = resetToken;
    user.resetTokenExpiresAt = new Date(Date.now() + 3600000); // 1 hour
    user.verificationCode = null; // Clear OTP
    await this.userRepository.save(user);

    return { token: resetToken };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { 
        email: resetPasswordDto.email, 
        resetToken: resetPasswordDto.token 
      },
    });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    await this.userRepository.save(user);

    return { message: 'Password has been reset successfully.' };
  }

  async updateProfile(userId: string, updateDto: { name: string; email: string; imageUrl?: string }): Promise<Partial<User>> {
    console.log(`[AuthService] Updating profile for user ${userId}`, updateDto);
    const user = await this.getCurrentUser(userId);
    const previousEmail = user.email;

    if (updateDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({ where: { email: updateDto.email } });
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
      user.email = updateDto.email;
    }

    user.displayName = updateDto.name;
    if (updateDto.imageUrl) {
      user.imageUrl = updateDto.imageUrl;
    }
    await this.userRepository.save(user);

    if (previousEmail !== user.email) {
      try {
        await this.notificationsService.create({
          userId,
          type: 'email_changed',
          category: 'security',
          severity: 'warning',
          title: 'Email changed',
          message: `Your login email was changed from ${previousEmail} to ${user.email}.`,
        });
      } catch (error) {
        this.logger.warn(`Failed to create email change notification: ${error.message}`);
      }
    }

    const { password, spotifyAccessToken, spotifyRefreshToken, ...safeUser } = user;
    return safeUser;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.getCurrentUser(userId);

    // Handle password change with explicit current password verification.
    if (changePasswordDto.newPassword !== undefined) {
      if (!changePasswordDto.currentPassword) {
        throw new BadRequestException('Please provide current password');
      }

      if (!(await user.comparePassword(changePasswordDto.currentPassword))) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      user.password = await bcrypt.hash(changePasswordDto.newPassword, 10);
      await this.userRepository.save(user);

      try {
        await this.notificationsService.create({
          userId,
          type: 'password_changed',
          category: 'security',
          severity: 'warning',
          title: 'Password changed',
          message: 'Your account password was changed successfully.',
        });
      } catch (error) {
        this.logger.warn(`Failed to create password change notification: ${error.message}`);
      }

      return { message: 'Password changed successfully.' };
    }

    throw new BadRequestException('Please provide new password');
  }

  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    return user;
  }
}
