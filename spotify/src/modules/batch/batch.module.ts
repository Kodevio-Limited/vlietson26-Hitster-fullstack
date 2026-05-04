import { Module } from '@nestjs/common';
import { BatchService } from './batch.service';
import { BatchController } from './batch.controller';
import { SongsModule } from '../songs/songs.module';
import { MappingsModule } from '../mappings/mappings.module';
import { QrCodesModule } from '../qr-codes/qr-codes.module';

@Module({
  imports: [SongsModule, MappingsModule, QrCodesModule],
  controllers: [BatchController],
  providers: [BatchService],
  exports: [BatchService],
})
export class BatchModule {}
