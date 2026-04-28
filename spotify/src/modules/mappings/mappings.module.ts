import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MappingsService } from './mappings.service';
import { MappingsController } from './mappings.controller';
import { Mapping } from './entities/mapping.entity';
import { SongsModule } from '../songs/songs.module';
import { QrCodesModule } from '../qr-codes/qr-codes.module';
import { QrCardsModule } from '../qr-cards/qr-cards.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Mapping]),
    SongsModule,
    QrCodesModule,
    QrCardsModule,
    NotificationsModule,
  ],
  controllers: [MappingsController],
  providers: [MappingsService],
  exports: [MappingsService],
})
export class MappingsModule {}
