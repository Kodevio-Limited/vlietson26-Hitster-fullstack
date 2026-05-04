import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCardsService } from './qr-cards.service';
import { QrCardsController } from './qr-cards.controller';
import { QrCard } from './entities/qr-card.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QrCard])],
  controllers: [QrCardsController],
  providers: [QrCardsService],
  exports: [QrCardsService],
})
export class QrCardsModule {}
