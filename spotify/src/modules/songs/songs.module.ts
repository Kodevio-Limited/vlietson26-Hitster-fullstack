import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { Song } from './entities/song.entity';
import { SpotifyModule } from '../spotify/spotify.module';
import { CacheService } from '../../common/services/cache.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Song]), SpotifyModule, NotificationsModule],
  controllers: [SongsController],
  providers: [SongsService, CacheService],
  exports: [SongsService],
})
export class SongsModule {}
