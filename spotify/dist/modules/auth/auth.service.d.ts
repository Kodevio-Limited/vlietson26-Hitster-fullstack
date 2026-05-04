import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class AuthService {
    private readonly userRepository;
    private readonly jwtService;
    private readonly httpService;
    private readonly configService;
    private readonly mailService;
    private readonly notificationsService;
    private readonly logger;
    constructor(userRepository: Repository<User>, jwtService: JwtService, httpService: HttpService, configService: ConfigService, mailService: MailService, notificationsService: NotificationsService);
    getSpotifyAuthUrl(): string;
    spotifyLogin(authCode: string): Promise<{
        jwtToken: string;
        user: Partial<User>;
    }>;
    private exchangeSpotifyCode;
    private getSpotifyUser;
    private isAdminEmail;
    refreshSpotifyToken(userId: string): Promise<string>;
    login(loginDto: LoginDto): Promise<{
        jwtToken: string;
        user: Partial<User>;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
        otp?: string;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        token: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    updateProfile(userId: string, updateDto: {
        name: string;
        email: string;
        imageUrl?: string;
    }): Promise<Partial<User>>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getCurrentUser(userId: string): Promise<User>;
}
