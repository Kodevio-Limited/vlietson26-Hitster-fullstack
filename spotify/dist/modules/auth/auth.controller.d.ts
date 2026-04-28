import { AuthService } from './auth.service';
import { SpotifyLoginDto } from './dto/spotify-login.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    getSpotifyAuthUrl(): {
        url: string;
    };
    spotifyLogin(spotifyLoginDto: SpotifyLoginDto): Promise<{
        jwtToken: string;
        user: Partial<import("./entities/user.entity").User>;
    }>;
    login(loginDto: LoginDto): Promise<{
        jwtToken: string;
        user: Partial<import("./entities/user.entity").User>;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
        otp?: string;
    }>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
        token: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    updateProfile(req: any, updateDto: {
        name: string;
        email: string;
        imageUrl?: string;
    }): Promise<Partial<import("./entities/user.entity").User>>;
    changePassword(req: any, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getCurrentUser(req: any): Promise<{
        id: string;
        email: string;
        spotifyId: string;
        clerkId: string;
        verificationCode?: string | null;
        resetToken?: string | null;
        resetTokenExpiresAt?: Date | null;
        displayName: string;
        imageUrl?: string;
        role: string;
        spotifyTokenExpiresAt: Date;
        hasPremium: boolean;
        isActive: boolean;
        lastLoginAt: Date;
        createdAt: Date;
        updatedAt: Date;
        mappings: import("../mappings/entities/mapping.entity").Mapping[];
    }>;
    refreshSpotifyToken(req: any): Promise<{
        spotifyAccessToken: string;
    }>;
}
