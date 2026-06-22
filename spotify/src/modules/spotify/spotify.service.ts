import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * The projection we hand back to the rest of the app. Most fields
 * are slim subsets of the Spotify Track / Album objects (see
 * `SpotifyRawTrack` / `SpotifyRawAlbum` below) — the original
 * payloads have ~30 fields each, the rest of the app only reads
 * a handful.
 */
export interface SpotifyTrackInfo {
  id: string;
  name: string;
  artist: string;
  artists: { id: string; name: string }[];
  /** Album display name (e.g. "OK Computer"). */
  album: string;
  albumId: string;
  albumImage?: string;
  albumImages?: { url: string }[];
  /**
   * The full raw album envelope (id, name, images, `release_date`).
   * Kept on the response so consumers can extract the release year
   * without a second round-trip to `GET /v1/albums/:id`. The `album`
   * field above is just the name for display.
   */
  rawAlbum: SpotifyRawAlbum;
  previewUrl: string | null;
  spotifyUrl: string;
  duration: number;
  durationFormatted: string;
  popularity: number;
  explicit: boolean;
}

/* ---------- Raw Spotify envelope shapes (only the fields we read) ---------- */

interface SpotifyTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface SpotifyRawArtist {
  id: string;
  name: string;
}

interface SpotifyRawAlbum {
  id: string;
  name: string;
  images: { url: string; height: number | null; width: number | null }[];
  /**
   * ISO-8601 release date string (`"YYYY"`, `"YYYY-MM"`, or
   * `"YYYY-MM-DD"`). The track-search response includes this;
   * `getTrackById` does not. Optional because the slim track
   * payload from `getTrackById` may omit the album.
   */
  release_date?: string;
}

interface SpotifyRawTrack {
  id: string;
  name: string;
  artists: SpotifyRawArtist[];
  album: SpotifyRawAlbum;
  preview_url: string | null;
  external_urls: { spotify: string };
  duration_ms: number;
  popularity: number;
  explicit: boolean;
}

interface SpotifySearchResponse {
  tracks: { items: SpotifyRawTrack[] };
}

interface SpotifySeveralTracksResponse {
  tracks: (SpotifyRawTrack | null)[];
}

interface SpotifyAlbumTracksResponse {
  items: {
    id: string;
    name: string;
    duration_ms: number;
    track_number: number;
  }[];
}

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
        this.httpService.post<SpotifyTokenResponse>(
          'https://accounts.spotify.com/api/token',
          'grant_type=client_credentials',
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;
      this.logger.log('Spotify access token obtained successfully');
      return this.accessToken;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get Spotify access token', message);
      throw new HttpException(
        'Failed to authenticate with Spotify API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async searchTracks(
    query: string,
    limit: number = 10,
  ): Promise<SpotifyTrackInfo[]> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get<SpotifySearchResponse>(
          'https://api.spotify.com/v1/search',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: {
              q: query,
              type: 'track',
              limit: Math.min(limit, 50),
            },
          },
        ),
      );

      return response.data.tracks.items.map((track) => this.toTrackInfo(track));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to search tracks: ${query}`, message);
      throw new HttpException(
        'Failed to search tracks on Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTrackById(trackId: string): Promise<SpotifyTrackInfo> {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get<SpotifyRawTrack>(
          `https://api.spotify.com/v1/tracks/${trackId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      return this.toTrackInfo(response.data);
    } catch (error: unknown) {
      // Narrow to the axios error shape to detect 404 separately
      // (track genuinely doesn't exist) from generic 5xx (Spotify
      // itself is broken).
      const status =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object'
          ? (error as { response: { status?: number } }).response.status
          : undefined;
      const message = error instanceof Error ? error.message : String(error);
      if (status === 404) {
        throw new HttpException(
          'Track not found on Spotify',
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.error(`Failed to get track: ${trackId}`, message);
      throw new HttpException(
        'Failed to get track details from Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getSeveralTracks(trackIds: string[]): Promise<SpotifyTrackInfo[]> {
    const token = await this.getAccessToken();
    const ids = trackIds.join(',');

    try {
      const response = await firstValueFrom(
        this.httpService.get<SpotifySeveralTracksResponse>(
          `https://api.spotify.com/v1/tracks`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: { ids },
          },
        ),
      );

      // Spotify returns `null` for each id it couldn't find — drop
      // those before projecting.
      return response.data.tracks
        .filter((track): track is SpotifyRawTrack => track !== null)
        .map((track) =>
          this.toTrackInfo(track, /* includeAlbumImages */ false),
        );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get several tracks`, message);
      throw new HttpException(
        'Failed to get tracks from Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAlbumTracks(
    albumId: string,
  ): Promise<
    { id: string; name: string; duration: number; trackNumber: number }[]
  > {
    const token = await this.getAccessToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get<SpotifyAlbumTracksResponse>(
          `https://api.spotify.com/v1/albums/${albumId}/tracks`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params: { limit: 50 },
          },
        ),
      );

      return response.data.items.map((track) => ({
        id: track.id,
        name: track.name,
        duration: track.duration_ms,
        trackNumber: track.track_number,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get album tracks: ${albumId}`, message);
      throw new HttpException(
        'Failed to get album tracks from Spotify',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Project a raw Spotify track into our slim `SpotifyTrackInfo`.
   * `includeAlbumImages` is `true` for the search path (the frontend
   * uses the full image list for the search-result cards) and
   * `false` for the several-tracks path (only the cover is needed).
   */
  private toTrackInfo(
    track: SpotifyRawTrack,
    includeAlbumImages: boolean = true,
  ): SpotifyTrackInfo {
    return {
      id: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(', '),
      artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
      album: track.album.name,
      albumId: track.album.id,
      albumImage: track.album.images[0]?.url,
      ...(includeAlbumImages ? { albumImages: track.album.images } : {}),
      rawAlbum: track.album,
      previewUrl: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
      duration: track.duration_ms,
      durationFormatted: this.formatDuration(track.duration_ms),
      popularity: track.popularity,
      explicit: track.explicit,
    };
  }

  private formatDuration(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
  }
}
