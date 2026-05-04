import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SpotifyService } from './spotify.service';

@Controller('spotify')
@UseGuards(JwtAuthGuard)
export class SpotifyController {
  constructor(private readonly spotifyService: SpotifyService) {}

  @Get('search')
  async searchTracks(@Query('q') query: string, @Query('limit') limit: number = 10) {
    const results = await this.spotifyService.searchTracks(query, limit);
    return {
      success: true,
      query,
      count: results.length,
      data: results,
    };
  }

  @Get('track')
  async getTrack(@Query('id') id: string) {
    const track = await this.spotifyService.getTrackById(id);
    return {
      success: true,
      data: track,
    };
  }

  @Get('tracks')
  async getSeveralTracks(@Query('ids') ids: string) {
    const trackIds = ids.split(',');
    const tracks = await this.spotifyService.getSeveralTracks(trackIds);
    return {
      success: true,
      count: tracks.length,
      data: tracks,
    };
  }
}
