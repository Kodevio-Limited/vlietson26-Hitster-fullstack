import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { SpotifyLoginDto } from './dto/spotify-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('spotify/url')
  getSpotifyAuthUrl() {
    return { url: this.authService.getSpotifyAuthUrl() };
  }

  @Post('spotify/login')
  async spotifyLogin(@Body() spotifyLoginDto: SpotifyLoginDto) {
    return this.authService.spotifyLogin(spotifyLoginDto.code);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('update-profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() updateDto: { name: string; email: string; imageUrl?: string }) {
    return this.authService.updateProfile(req.user.id, updateDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Request() req) {
    const user = await this.authService.getCurrentUser(req.user.id);
    const { password, spotifyAccessToken, spotifyRefreshToken, ...safeUser } = user;
    return safeUser;
  }

  @Post('spotify/refresh')
  @UseGuards(JwtAuthGuard)
  async refreshSpotifyToken(@Request() req) {
    const newToken = await this.authService.refreshSpotifyToken(req.user.id);
    return { spotifyAccessToken: newToken };
  }
}
