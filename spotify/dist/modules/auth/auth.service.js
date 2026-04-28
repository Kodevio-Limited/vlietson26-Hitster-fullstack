"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const user_entity_1 = require("./entities/user.entity");
const bcrypt = __importStar(require("bcrypt"));
const mail_service_1 = require("../mail/mail.service");
const notifications_service_1 = require("../notifications/notifications.service");
let AuthService = AuthService_1 = class AuthService {
    userRepository;
    jwtService;
    httpService;
    configService;
    mailService;
    notificationsService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(userRepository, jwtService, httpService, configService, mailService, notificationsService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.httpService = httpService;
        this.configService = configService;
        this.mailService = mailService;
        this.notificationsService = notificationsService;
    }
    getSpotifyAuthUrl() {
        const clientId = this.configService.get('spotify.clientId');
        const redirectUri = this.configService.get('spotify.redirectUri');
        const scopes = [
            'user-read-private',
            'user-read-email',
            'user-modify-playback-state',
            'user-read-playback-state',
            'user-read-currently-playing',
        ].join(' ');
        return `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    }
    async spotifyLogin(authCode) {
        const spotifyTokens = await this.exchangeSpotifyCode(authCode);
        const spotifyUser = await this.getSpotifyUser(spotifyTokens.access_token);
        let user = await this.userRepository.findOne({
            where: { spotifyId: spotifyUser.id },
        });
        if (!user) {
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
        }
        else {
            user.spotifyAccessToken = spotifyTokens.access_token;
            user.spotifyRefreshToken = spotifyTokens.refresh_token;
            user.spotifyTokenExpiresAt = new Date(Date.now() + spotifyTokens.expires_in * 1000);
            user.hasPremium = spotifyUser.product === 'premium';
            user.lastLoginAt = new Date();
        }
        await this.userRepository.save(user);
        const jwtToken = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            spotifyId: user.spotifyId,
        });
        const { spotifyAccessToken, spotifyRefreshToken, ...safeUser } = user;
        return { jwtToken, user: safeUser };
    }
    async exchangeSpotifyCode(code) {
        const auth = Buffer.from(`${this.configService.get('spotify.clientId')}:${this.configService.get('spotify.clientSecret')}`).toString('base64');
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post('https://accounts.spotify.com/api/token', new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.configService.get('spotify.redirectUri'),
            }).toString(), {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }));
            return response.data;
        }
        catch (error) {
            const err = error;
            console.error('Spotify token exchange error:', err.response?.data || err.message);
            throw new common_1.UnauthorizedException('Failed to authenticate with Spotify');
        }
    }
    async getSpotifyUser(accessToken) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            }));
            return response.data;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Failed to get Spotify user info');
        }
    }
    isAdminEmail(email) {
        const adminEmails = [
            'vandervliet.rick@gmail.com',
            'admin@bouwradio.com',
        ];
        return adminEmails.includes(email);
    }
    async refreshSpotifyToken(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user || !user.spotifyRefreshToken) {
            throw new common_1.UnauthorizedException('No refresh token available');
        }
        const auth = Buffer.from(`${this.configService.get('spotify.clientId')}:${this.configService.get('spotify.clientSecret')}`).toString('base64');
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post('https://accounts.spotify.com/api/token', new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: user.spotifyRefreshToken,
            }).toString(), {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }));
            user.spotifyAccessToken = response.data.access_token;
            user.spotifyTokenExpiresAt = new Date(Date.now() + response.data.expires_in * 1000);
            if (response.data.refresh_token) {
                user.spotifyRefreshToken = response.data.refresh_token;
            }
            await this.userRepository.save(user);
            return response.data.access_token;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Failed to refresh Spotify token');
        }
    }
    async login(loginDto) {
        const user = await this.userRepository.findOne({
            where: { email: loginDto.email },
        });
        if (!user || !user.password) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
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
    async forgotPassword(email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            return { message: 'If an account with that email exists, we have sent a verification code.' };
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = otp;
        await this.userRepository.save(user);
        await this.mailService.sendVerificationCode(email, otp);
        return {
            message: 'Verification code sent to your email.',
            otp: process.env.NODE_ENV === 'development' ? otp : undefined
        };
    }
    async verifyOtp(verifyOtpDto) {
        const user = await this.userRepository.findOne({
            where: { email: verifyOtpDto.email, verificationCode: verifyOtpDto.code },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid verification code');
        }
        const resetToken = Math.random().toString(36).substring(2, 15);
        user.resetToken = resetToken;
        user.resetTokenExpiresAt = new Date(Date.now() + 3600000);
        user.verificationCode = null;
        await this.userRepository.save(user);
        return { token: resetToken };
    }
    async resetPassword(resetPasswordDto) {
        const user = await this.userRepository.findOne({
            where: {
                email: resetPasswordDto.email,
                resetToken: resetPasswordDto.token
            },
        });
        if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired reset token');
        }
        const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);
        user.password = hashedPassword;
        user.resetToken = null;
        user.resetTokenExpiresAt = null;
        await this.userRepository.save(user);
        return { message: 'Password has been reset successfully.' };
    }
    async updateProfile(userId, updateDto) {
        console.log(`[AuthService] Updating profile for user ${userId}`, updateDto);
        const user = await this.getCurrentUser(userId);
        const previousEmail = user.email;
        if (updateDto.email !== user.email) {
            const existingUser = await this.userRepository.findOne({ where: { email: updateDto.email } });
            if (existingUser && existingUser.id !== userId) {
                throw new common_1.ConflictException('Email already in use');
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
            }
            catch (error) {
                this.logger.warn(`Failed to create email change notification: ${error.message}`);
            }
        }
        const { password, spotifyAccessToken, spotifyRefreshToken, ...safeUser } = user;
        return safeUser;
    }
    async changePassword(userId, changePasswordDto) {
        const user = await this.getCurrentUser(userId);
        if (changePasswordDto.newPassword !== undefined) {
            if (!changePasswordDto.currentPassword) {
                throw new common_1.BadRequestException('Please provide current password');
            }
            if (!(await user.comparePassword(changePasswordDto.currentPassword))) {
                throw new common_1.UnauthorizedException('Current password is incorrect');
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
            }
            catch (error) {
                this.logger.warn(`Failed to create password change notification: ${error.message}`);
            }
            return { message: 'Password changed successfully.' };
        }
        throw new common_1.BadRequestException('Please provide new password');
    }
    async getCurrentUser(userId) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        axios_1.HttpService,
        config_1.ConfigService,
        mail_service_1.MailService,
        notifications_service_1.NotificationsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map