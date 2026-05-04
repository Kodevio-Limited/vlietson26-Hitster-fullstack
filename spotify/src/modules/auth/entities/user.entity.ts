import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Mapping } from '../../mappings/entities/mapping.entity';
import * as bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true, name: 'spotify_id' })
  spotifyId: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true, name: 'clerk_id' })
  clerkId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password?: string;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'verification_code' })
  verificationCode?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'reset_token' })
  resetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reset_token_expires_at' })
  resetTokenExpiresAt?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'display_name' })
  displayName: string;

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl?: string;

  @Column({ type: 'varchar', length: 50, default: 'user' })
  role: string;

  @Column({ type: 'text', nullable: true, name: 'spotify_access_token' })
  spotifyAccessToken: string;

  @Column({ type: 'text', nullable: true, name: 'spotify_refresh_token' })
  spotifyRefreshToken: string;

  @Column({ type: 'timestamp', nullable: true, name: 'spotify_token_expires_at' })
  spotifyTokenExpiresAt: Date;

  @Column({ type: 'boolean', default: false, name: 'has_premium' })
  hasPremium: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Mapping, (mapping) => mapping.createdBy)
  mappings: Mapping[];

  async comparePassword(rawPassword: string): Promise<boolean> {
    if (!this.password) {
      return false;
    }

    return bcrypt.compare(rawPassword, this.password);
  }
}
