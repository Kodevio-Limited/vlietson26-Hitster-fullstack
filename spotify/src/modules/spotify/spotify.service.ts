import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SpotifyService {
  private accessToken: string;
  private tokenExpiry: number;
  private readonly logger = new Logger(SpotifyService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(
      `${this.configService.get('spotify.clientId')}:${this.configService.get('spotify.clientSecret')}`,
    ).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://accounts.spotify.com/api/token',
          'grant_type=client_credentials',
          {
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      this.logger.log('Spotify access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      const err = error as any;
      this.logger.error('Failed to get Spotify access token', err.message);
      throw new HttpException(
        'Failed to authenticate with Spotify API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchTracks(query: string, limit: number = 10): Promise<any[]> {
    const token = await this.getAccessToken();
    
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.spotify.com/v1/search', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          params: {
            q: query,
            type: 'track',
            limit: Math.min(limit, 50),
          },
        }),
      );

      return response.data.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        artists: track.artists.map(a => ({ id: a.id, name: a.name })),
        album: track.album.name,
        albumId: track.album.id,
        albumImage: track.album.images[0]?.url,
        albumImages: track.album.images,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
        duration: track.duration_ms,
        durationFormatted: this.formatDuration(track.duration_ms),
        popularity: track.popularity,
        explicit: track.explicit,
      }));
    } catch (error) {
      const err = error as any;
      this.logger.error(`Failed to search tracks: ${query}`, err.message);
      throw new HttpException(
        'Failed to search tracks on Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTrackById(trackId: string): Promise<any> {
    const token = await this.getAccessToken();
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      );

      const track = response.data;
      return {
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        artists: track.artists.map(a => ({ id: a.id, name: a.name })),
        album: track.album.name,
        albumId: track.album.id,
        albumImage: track.album.images[0]?.url,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
        duration: track.duration_ms,
        durationFormatted: this.formatDuration(track.duration_ms),
        popularity: track.popularity,
        explicit: track.explicit,
      };
    } catch (error) {
      const err = error as any;
      if (err.response?.status === 404) {
        throw new HttpException('Track not found on Spotify', HttpStatus.NOT_FOUND);
      }
      this.logger.error(`Failed to get track: ${trackId}`, err.message);
      throw new HttpException(
        'Failed to get track details from Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSeveralTracks(trackIds: string[]): Promise<any[]> {
    const token = await this.getAccessToken();
    const ids = trackIds.join(',');
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://api.spotify.com/v1/tracks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          params: { ids },
        }),
      );

      return response.data.tracks.map(track => ({
        id: track.id,
        name: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        albumImage: track.album.images[0]?.url,
        spotifyUrl: track.external_urls.spotify,
        previewUrl: track.preview_url,
      }));
    } catch (error) {
      const err = error as any;
      this.logger.error(`Failed to get several tracks`, err.message);
      throw new HttpException(
        'Failed to get tracks from Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAlbumTracks(albumId: string): Promise<any[]> {
    const token = await this.getAccessToken();
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          params: { limit: 50 },
        }),
      );

      return response.data.items.map(track => ({
        id: track.id,
        name: track.name,
        duration: track.duration_ms,
        trackNumber: track.track_number,
      }));
    } catch (error) {
      const err = error as any;
      this.logger.error(`Failed to get album tracks: ${albumId}`, err.message);
      throw new HttpException(
        'Failed to get album tracks from Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
  }
}
