import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { SongsModule } from './modules/songs/songs.module';
import { QrCodesModule } from './modules/qr-codes/qr-codes.module';
import { QrCardsModule } from './modules/qr-cards/qr-cards.module';
import { MappingsModule } from './modules/mappings/mappings.module';
import { SpotifyModule } from './modules/spotify/spotify.module';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { BatchModule } from './modules/batch/batch.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QrRedirectController } from './modules/qr-redirect/qr-redirect.controller';
import { Song } from './modules/songs/entities/song.entity';
import { QrCode } from './modules/qr-codes/entities/qr-code.entity';
import { QrCard } from './modules/qr-cards/entities/qr-card.entity';
import { Mapping } from './modules/mappings/entities/mapping.entity';
import { User } from './modules/auth/entities/user.entity';
import { Notification } from './modules/notifications/entities/notification.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [Song, QrCode, QrCard, Mapping, User, Notification],
        synchronize: configService.get('nodeEnv') !== 'production',
        logging: configService.get('nodeEnv') === 'development',
        ssl: configService.get('database.ssl') ? {
          rejectUnauthorized: false,
        } : false,
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        },
        retryAttempts: 5,
        retryDelay: 5000,
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('throttle.ttl')!,
            limit: configService.get<number>('throttle.limit')!,
          },
        ],
      }),
      inject: [ConfigService],
    }),
    SongsModule,
    QrCodesModule,
    QrCardsModule,
    MappingsModule,
    SpotifyModule,
    AuthModule,
    MailModule,
    BatchModule,
    NotificationsModule,
  ],
  controllers: [QrRedirectController],
})
export class AppModule {}
