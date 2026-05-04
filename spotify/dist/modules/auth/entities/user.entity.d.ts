import { Mapping } from '../../mappings/entities/mapping.entity';
export declare class User {
    id: string;
    email: string;
    spotifyId: string;
    clerkId: string;
    password?: string;
    verificationCode?: string | null;
    resetToken?: string | null;
    resetTokenExpiresAt?: Date | null;
    displayName: string;
    imageUrl?: string;
    role: string;
    spotifyAccessToken: string;
    spotifyRefreshToken: string;
    spotifyTokenExpiresAt: Date;
    hasPremium: boolean;
    isActive: boolean;
    lastLoginAt: Date;
    createdAt: Date;
    updatedAt: Date;
    mappings: Mapping[];
    comparePassword(rawPassword: string): Promise<boolean>;
}
