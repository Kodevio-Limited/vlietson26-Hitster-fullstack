import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { of } from 'rxjs';

import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Admin role must never be granted via a public endpoint. Until the
 * DB-driven admin flag (deferred) lands, the only safe behavior is to
 * default every new user — register or Spotify login — to role='user'.
 *
 * These tests pin that behavior so a future regression can't quietly
 * re-introduce self-promotion.
 */
describe('AuthService — role default', () => {
  let service: AuthService;

  const userRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
  };

  const configService = {
    get: jest.fn().mockImplementation((key: string) => {
      const map: Record<string, string> = {
        'spotify.clientId': 'test-client-id',
        'spotify.clientSecret': 'test-client-secret',
        'spotify.redirectUri': 'http://localhost/callback',
      };
      return map[key] ?? null;
    }),
  };

  const httpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mailService = {
    sendVerificationCode: jest.fn(),
  };

  const notificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: HttpService, useValue: httpService },
        { provide: MailService, useValue: mailService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = moduleRef.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register()', () => {
    it('defaults role to "user" when the email is in the admin allow-list', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: Partial<User>) => ({
        ...data,
        id: 'new-user-id',
      }));
      userRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      const result = await service.register({
        email: 'admin@bouwradio.com',
        password: 'password123',
        displayName: 'Admin',
      });

      expect(result.user.role).toBe('user');
    });

    it('defaults role to "user" for non-admin emails', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: Partial<User>) => ({
        ...data,
        id: 'new-user-id',
      }));
      userRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      const result = await service.register({
        email: 'regular@example.com',
        password: 'password123',
      });

      expect(result.user.role).toBe('user');
    });

    it('throws ConflictException if the email already exists', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'existing-id',
        email: 'admin@bouwradio.com',
      });

      await expect(
        service.register({
          email: 'admin@bouwradio.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('spotifyLogin()', () => {
    it('defaults role to "user" when the Spotify user email is in the admin allow-list', async () => {
      // New user — no existing row.
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: Partial<User>) => ({
        ...data,
        id: 'new-user-id',
      }));
      userRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      // Mock Spotify token exchange.
      httpService.post.mockReturnValue(
        of({
          data: {
            access_token: 'spotify-access-token',
            refresh_token: 'spotify-refresh-token',
            expires_in: 3600,
          },
        }),
      );
      // Mock Spotify /me.
      httpService.get.mockReturnValue(
        of({
          data: {
            id: 'spotify-user-id',
            email: 'admin@bouwradio.com',
            display_name: 'Admin',
            product: 'premium',
          },
        }),
      );

      const result = await service.spotifyLogin('auth-code-from-spotify');

      expect(result.user.role).toBe('user');
    });

    it('defaults role to "user" for non-admin Spotify emails', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((data: Partial<User>) => ({
        ...data,
        id: 'new-user-id',
      }));
      userRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      httpService.post.mockReturnValue(
        of({
          data: {
            access_token: 'spotify-access-token',
            refresh_token: 'spotify-refresh-token',
            expires_in: 3600,
          },
        }),
      );
      httpService.get.mockReturnValue(
        of({
          data: {
            id: 'spotify-user-id',
            email: 'regular@example.com',
            display_name: 'Regular',
            product: 'free',
          },
        }),
      );

      const result = await service.spotifyLogin('auth-code-from-spotify');

      expect(result.user.role).toBe('user');
    });
  });
});