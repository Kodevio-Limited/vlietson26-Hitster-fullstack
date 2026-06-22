import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { randomInt, randomBytes } from 'node:crypto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Shape of the response from Spotify's `POST /api/token` endpoint
 * (both the initial code-exchange and the refresh flow return the
 * same envelope). Only the fields we actually read are declared.
 */
interface SpotifyTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

/**
 * Shape of the response from Spotify's `GET /v1/me` endpoint. Only
 * the fields we use; the full schema has many more. `display_name`
 * is nullable per the Spotify API; `product` is the plan tier as a
 * free-form string.
 */
interface SpotifyUserProfile {
  id: string;
  email: string;
  display_name: string | null;
  product: string;
}

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

  /**
   * Build the JWT payload for `user`. Centralized so every sign site
   * (`login`, `register`, `spotifyLogin`) embeds the same claims,
   * including `tokenVersion` — the revocation handle checked by
   * `JwtStrategy.validate`. A password change bumps the column and
   * any previously-minted token fails the check on its next request.
   */
  private buildJwtPayload(user: User): {
    sub: string;
    email: string;
    role: string;
    spotifyId: string | null;
    tokenVersion: number;
  } {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      spotifyId: user.spotifyId ?? null,
      tokenVersion: user.tokenVersion,
    };
  }

  /** Increment the user's `tokenVersion`. Invalidates every existing JWT. */
  private async bumpTokenVersion(user: User): Promise<void> {
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepository.save(user);
    this.logger.log(
      `Bumped tokenVersion to ${user.tokenVersion} for user ${user.id}`,
    );
  }

  getSpotifyAuthUrl(): string {
    const clientId = this.configService.get<string>('spotify.clientId');
    const redirectUri = this.configService.get<string>('spotify.redirectUri');
    const scopes = [
      'user-read-private',
      'user-read-email',
      'user-modify-playback-state',
      'user-read-playback-state',
      'user-read-currently-playing',
    ].join(' ');

    return `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(
      scopes,
    )}&redirect_uri=${encodeURIComponent(redirectUri!)}`;
  }

  async spotifyLogin(
    authCode: string,
  ): Promise<{ jwtToken: string; user: Partial<User> }> {
    // Exchange auth code for Spotify tokens
    const spotifyTokens = await this.exchangeSpotifyCode(authCode);

    // Get Spotify user info
    const spotifyUser = await this.getSpotifyUser(spotifyTokens.access_token);

    // Find or create user in database
    let user = await this.userRepository.findOne({
      where: { spotifyId: spotifyUser.id },
    });

    if (!user) {
      // Role must never be granted by a public endpoint. Until the
      // DB-driven admin flag (deferred) lands, default every new user
      // — register or Spotify login — to 'user'. Existing admin rows
      // keep their role on re-login; new admins are created by promoting
      // an existing user out of band.
      user = this.userRepository.create({
        email: spotifyUser.email,
        spotifyId: spotifyUser.id,
        // Spotify may return a null `display_name`; the User column
        // is nullable, so the TS type is `string` (not `string | null`).
        // Coerce null to undefined for the create call.
        displayName: spotifyUser.display_name ?? undefined,
        role: 'user',
        spotifyAccessToken: spotifyTokens.access_token,
        spotifyRefreshToken: spotifyTokens.refresh_token,
        spotifyTokenExpiresAt: new Date(
          Date.now() + spotifyTokens.expires_in * 1000,
        ),
        hasPremium: spotifyUser.product === 'premium',
        lastLoginAt: new Date(),
      });
    } else {
      // Update existing user's tokens
      user.spotifyAccessToken = spotifyTokens.access_token;
      user.spotifyRefreshToken = spotifyTokens.refresh_token;
      user.spotifyTokenExpiresAt = new Date(
        Date.now() + spotifyTokens.expires_in * 1000,
      );
      user.hasPremium = spotifyUser.product === 'premium';
      user.lastLoginAt = new Date();
    }

    await this.userRepository.save(user);

    // Generate JWT token
    const jwtToken = this.jwtService.sign(this.buildJwtPayload(user));

    // Return JWT and user info (excluding sensitive tokens). The
    // underscored names are destructured for the side effect of
    // excluding them from `safeUser`; `void` them to satisfy
    // unused-vars.
    const {
      spotifyAccessToken: _spotifyAccessToken,
      spotifyRefreshToken: _spotifyRefreshToken,
      ...safeUser
    } = user;
    void _spotifyAccessToken;
    void _spotifyRefreshToken;
    return { jwtToken, user: safeUser };
  }

  private async exchangeSpotifyCode(
    code: string,
  ): Promise<SpotifyTokenResponse> {
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
            redirect_uri: this.configService.get<string>(
              'spotify.redirectUri',
            )!,
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      // `response.data` is typed `any` by axios — cast to the
      // Spotify envelope we just declared.
      return response.data as SpotifyTokenResponse;
    } catch (error: unknown) {
      // Narrow the axios error shape to extract the response body
      // for the debug log; swallow the rest.
      const responseBody =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object'
          ? (error as { response: { data: unknown } }).response.data
          : undefined;
      const message = error instanceof Error ? error.message : String(error);
      console.error('Spotify token exchange error:', responseBody ?? message);
      throw new UnauthorizedException('Failed to authenticate with Spotify');
    }
  }

  private async getSpotifyUser(
    accessToken: string,
  ): Promise<SpotifyUserProfile> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<SpotifyUserProfile>(
          'https://api.spotify.com/v1/me',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        ),
      );
      return response.data;
    } catch {
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
        this.httpService.post<SpotifyTokenResponse>(
          'https://accounts.spotify.com/api/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: user.spotifyRefreshToken,
          }).toString(),
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      const tokens = response.data;
      user.spotifyAccessToken = tokens.access_token;
      user.spotifyTokenExpiresAt = new Date(
        Date.now() + tokens.expires_in * 1000,
      );
      if (tokens.refresh_token) {
        user.spotifyRefreshToken = tokens.refresh_token;
      }
      await this.userRepository.save(user);

      return tokens.access_token;
    } catch {
      throw new UnauthorizedException('Failed to refresh Spotify token');
    }
  }

  async login(
    loginDto: LoginDto,
  ): Promise<{ jwtToken: string; user: Partial<User> }> {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtToken = this.jwtService.sign(this.buildJwtPayload(user));

    const {
      password: _password,
      spotifyAccessToken: _spotifyAccessToken,
      spotifyRefreshToken: _spotifyRefreshToken,
      ...safeUser
    } = user;
    void _password;
    void _spotifyAccessToken;
    void _spotifyRefreshToken;
    return { jwtToken, user: safeUser };
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ jwtToken: string; user: Partial<User> }> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Role must never be granted by a public endpoint. Until the
    // DB-driven admin flag (deferred) lands, default every new user
    // to 'user'. `isAdminEmail()` is retained as a private helper for
    // the future admin-invite flow but is not consulted here.
    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      displayName: registerDto.displayName || registerDto.email.split('@')[0],
      role: 'user',
      lastLoginAt: new Date(),
    });

    await this.userRepository.save(user);

    const jwtToken = this.jwtService.sign(this.buildJwtPayload(user));

    const {
      password: _password,
      spotifyAccessToken: _spotifyAccessToken,
      spotifyRefreshToken: _spotifyRefreshToken,
      ...safeUser
    } = user;
    void _password;
    void _spotifyAccessToken;
    void _spotifyRefreshToken;
    return { jwtToken, user: safeUser };
  }

  async forgotPassword(
    email: string,
  ): Promise<{ message: string; otp?: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // For security, don't reveal if user exists
      return {
        message:
          'If an account with that email exists, we have sent a verification code.',
      };
    }

    // Generate 6-digit OTP using a CSPRNG. Math.random() is predictable
    // and not safe for security tokens.
    const otp = randomInt(100000, 1000000).toString();
    user.verificationCode = otp;
    await this.userRepository.save(user);

    // Send real email
    await this.mailService.sendVerificationCode(email, otp);

    return {
      message: 'Verification code sent to your email.',
      // Do not include OTP in response at all; dev convenience should go
      // through a dedicated debug endpoint to avoid email enumeration
      // via response-shape differences (Object.keys length differs).
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{ token: string }> {
    const user = await this.userRepository.findOne({
      where: { email: verifyOtpDto.email, verificationCode: verifyOtpDto.code },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // 32-byte cryptographically random token, hex-encoded.
    const resetToken = randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiresAt = new Date(Date.now() + 3600000); // 1 hour
    user.verificationCode = null; // Clear OTP
    await this.userRepository.save(user);

    return { token: resetToken };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: {
        email: resetPasswordDto.email,
        resetToken: resetPasswordDto.token,
      },
    });

    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiresAt = null;
    // Bump invalidates every JWT currently in flight for this user
    // (including any captured before the reset).
    await this.bumpTokenVersion(user);

    return { message: 'Password has been reset successfully.' };
  }

  async updateProfile(
    userId: string,
    updateDto: { name: string; imageUrl?: string },
  ): Promise<Partial<User>> {
    this.logger.log(`Updating profile for user ${userId}`);
    const user = await this.getCurrentUser(userId);

    user.displayName = updateDto.name;
    if (updateDto.imageUrl) {
      user.imageUrl = updateDto.imageUrl;
    }
    await this.userRepository.save(user);

    const {
      password: _password,
      spotifyAccessToken: _spotifyAccessToken,
      spotifyRefreshToken: _spotifyRefreshToken,
      verificationCode: _verificationCode,
      resetToken: _resetToken,
      ...safeUser
    } = user;
    void _password;
    void _spotifyAccessToken;
    void _spotifyRefreshToken;
    void _verificationCode;
    void _resetToken;
    return safeUser;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
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
      // Bumping `tokenVersion` revokes any other active session for
      // this user (other browsers, the mobile client, etc.) — they
      // re-login on next request and get a fresh token with the new
      // version. Without this, a stolen JWT remains valid until it
      // naturally expires, which on a 7d JWT_EXPIRES_IN is too long.
      await this.bumpTokenVersion(user);

      try {
        await this.notificationsService.create({
          userId,
          type: 'password_changed',
          category: 'security',
          severity: 'warning',
          title: 'Password changed',
          message: 'Your account password was changed successfully.',
        });
      } catch (error: unknown) {
        this.logger.warn(
          `Failed to create password change notification: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
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
