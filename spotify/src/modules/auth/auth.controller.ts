import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { SpotifyLoginDto } from './dto/spotify-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Auth endpoints get a tighter throttle than the global default.
  // ThrottlerModule is registered globally via APP_GUARD; this decorator
  // overrides per-handler.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Get('spotify/url')
  getSpotifyAuthUrl() {
    return { url: this.authService.getSpotifyAuthUrl() };
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('spotify/login')
  async spotifyLogin(@Body() spotifyLoginDto: SpotifyLoginDto) {
    return this.authService.spotifyLogin(spotifyLoginDto.code);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // Forgot password is the most attractive brute-force target (account
  // takeover via OTP spray); cap aggressively.
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('update-profile')
  async updateProfile(@Request() req, @Body() updateDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Request() req) {
    const user = await this.authService.getCurrentUser(req.user.id);
    // Strip sensitive fields that should never leave the server.
    const {
      password,
      spotifyAccessToken,
      spotifyRefreshToken,
      verificationCode,
      resetToken,
      ...safeUser
    } = user;
    return safeUser;
  }

  @UseGuards(JwtAuthGuard)
  @Post('spotify/refresh')
  async refreshSpotifyToken(@Request() req) {
    const newToken = await this.authService.refreshSpotifyToken(req.user.id);
    return { spotifyAccessToken: newToken };
  }
}
