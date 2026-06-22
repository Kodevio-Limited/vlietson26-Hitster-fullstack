import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Song } from './entities/song.entity';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SearchSongDto } from './dto/search-song.dto';
import { SpotifyService, SpotifyTrackInfo } from '../spotify/spotify.service';
import { CacheService } from '../../common/services/cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { QrCode } from '../qr-codes/entities/qr-code.entity';
import { MappingsService } from '../mappings/mappings.service';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);

  constructor(
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
    private readonly spotifyService: SpotifyService,
    private readonly cacheService: CacheService,
    private readonly notificationsService: NotificationsService,
    private readonly qrCodesService: QrCodesService,
    @Inject(forwardRef(() => MappingsService))
    private readonly mappingsService: MappingsService,
  ) {}

  async create(createSongDto: CreateSongDto): Promise<Song> {
    // Check if song already exists
    const existingSong = await this.songRepository.findOne({
      where: { spotifyTrackId: createSongDto.spotifyTrackId },
    });

    if (existingSong) {
      throw new ConflictException(
        'Song with this Spotify Track ID already exists',
      );
    }

    // Fetch additional track info from Spotify
    let spotifyInfo: SpotifyTrackInfo | null = null;
    try {
      spotifyInfo = await this.spotifyService.getTrackById(
        createSongDto.spotifyTrackId,
      );
      this.logger.log(
        `Fetched Spotify info for track: ${createSongDto.spotifyTrackId}`,
      );
    } catch (error: unknown) {
      this.logger.warn(`Could 
        not fetch Spotify info: ${(error as Error).message}`);
    }

    const song = this.songRepository.create({
      ...createSongDto,
      spotifyUrl: spotifyInfo?.spotifyUrl,
      albumImageUrl: spotifyInfo?.albumImage,
      previewUrl: spotifyInfo?.previewUrl ?? undefined,
    });

    const savedSong = await this.songRepository.save(song);
    this.cacheService.invalidatePattern('songs:*');
    await this.notificationsService.create({
      type: 'song_created',
      category: 'content',
      title: 'Song added',
      message: `"${savedSong.name}" by ${savedSong.artist} was added.`,
      metadata: { songId: savedSong.id },
    });
    this.logger.log(`Song created: ${savedSong.name} by ${savedSong.artist}`);

    return savedSong;
  }

  private extractSpotifyTrackId(input: string): string | null {
    const patterns = [/\/track\/([a-zA-Z0-9]+)/, /^([a-zA-Z0-9]+)$/];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  async importSong(spotifyUrl: string, userId: string): Promise<Song> {
    const trackId = this.extractSpotifyTrackId(spotifyUrl);
    if (!trackId) {
      throw new ConflictException('Invalid Spotify URL or Track ID');
    }

    // Check if song already exists
    let song = await this.songRepository.findOne({
      where: { spotifyTrackId: trackId },
      relations: ['mappings', 'mappings.qrCode'],
    });

    if (song) {
      throw new ConflictException(
        `This song is already imported (ID: ${song.spotifyTrackId})`,
      );
    }

    // Fetch track info from Spotify
    let spotifyInfo: SpotifyTrackInfo | null = null;
    try {
      spotifyInfo = await this.spotifyService.getTrackById(trackId);
    } catch (error: unknown) {
      throw new ConflictException(
        `Could not fetch info from Spotify: ${(error as Error).message}`,
      );
    }

    let releaseYear = new Date().getFullYear();
    // The full album envelope (with `release_date`) lives on
    // `rawAlbum`; the slim `album` field is just the display name.
    const releaseDate = spotifyInfo?.rawAlbum?.release_date;
    if (releaseDate) {
      const yearMatch = String(releaseDate).match(/^(\d{4})/);
      if (yearMatch) {
        releaseYear = parseInt(yearMatch[1], 10);
      }
    } else if (spotifyInfo?.albumId) {
      releaseYear = new Date().getFullYear(); // Fallback if no album release date is given by simple track fetch
    }

    song = this.songRepository.create({
      name: spotifyInfo?.name,
      artist: spotifyInfo?.artist,
      releaseYear: releaseYear,
      spotifyTrackId: trackId,
      spotifyUrl: spotifyInfo?.spotifyUrl,
      albumImageUrl: spotifyInfo?.albumImage,
      // Song.previewUrl is typed `string` (not nullable); coerce
      // the `string | null` from Spotify into undefined when absent.
      previewUrl: spotifyInfo?.previewUrl ?? undefined,
      plays: 0,
    });

    const savedSong = await this.songRepository.save(song);

    // Generate QR Code
    const identifier = randomUUID().replace(/-/g, '').substring(0, 10);
    const newQrCode = await this.qrCodesService.generateQrCode({
      identifier,
      spotifyUrl: spotifyInfo?.spotifyUrl || '',
      spotifyTrackId: trackId,
    });

    // Create Mapping
    await this.mappingsService.create(
      {
        songId: savedSong.id,
        qrCodeId: newQrCode.id,
      },
      userId,
    );

    this.cacheService.invalidatePattern('songs:*');
    await this.notificationsService.create({
      type: 'song_created',
      category: 'content',
      title: 'Song imported',
      message: `"${savedSong.name}" by ${savedSong.artist} was imported.`,
      metadata: { songId: savedSong.id },
    });

    return await this.findOne(savedSong.id);
  }

  async importSongsBulk(
    urls: string[],
    userId: string,
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const url of urls) {
      if (!url || !url.trim()) continue;
      try {
        await this.importSong(url.trim(), userId);
        successful++;
      } catch (error: unknown) {
        failed++;
        const errorMessage = (error as Error).message;
        errors.push(`Failed to import ${url}: ${errorMessage}`);
        this.logger.warn(`Bulk import failed for URL ${url}: ${errorMessage}`);
      }
    }

    return { successful, failed, errors };
  }

  async regenerateQrCode(songId: string, userId: string): Promise<QrCode> {
    // `userId` is accepted for API symmetry with the other write
    // endpoints (and so callers don't have to special-case the
    // signature) but isn't currently threaded into deactivation
    // audit trails. Mark it intentionally consumed to silence the
    // unused-vars rule until the audit-trail work lands.
    void userId;
    const song = await this.findOne(songId);

    // Find existing active mapping
    const mappings = await this.mappingsService.findBySong(songId);
    for (const mapping of mappings) {
      if (mapping.isActive) {
        await this.mappingsService.deactivate(mapping.id);
        if (mapping.qrCode) {
          await this.qrCodesService.deactivate(mapping.qrCode.id);
        }
      }
    }

    // Generate new QR Code
    const identifier = randomUUID().replace(/-/g, '').substring(0, 10);
    const newQrCode = await this.qrCodesService.generateQrCode({
      identifier,
      spotifyUrl:
        song.spotifyUrl ||
        `https://open.spotify.com/track/${song.spotifyTrackId}`,
      spotifyTrackId: song.spotifyTrackId,
    });
    return newQrCode;
  }

  async getSongQrCode(songId: string): Promise<QrCode> {
    const song = await this.findOne(songId);
    const mapping = song.mappings?.find((m) => m.isActive);
    if (!mapping || !mapping.qrCode) {
      throw new NotFoundException('No active QR code found for this song');
    }
    return await this.qrCodesService.findOne(mapping.qrCode.id);
  }

  async findAll(searchDto: SearchSongDto): Promise<{
    items: Song[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      q,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = searchDto;
    const safeLimit = Math.min(limit, 100);

    // Cache COUNT and the page separately. The previous code used
    // TypeORM's `findAndCount`, which runs a fresh `SELECT COUNT(*)`
    // on every request — a sequential scan that scales with row count.
    // With pagination across pages 1..N, the COUNT result is identical
    // for every page (same WHERE); caching it once at 5min TTL means
    // only the SELECT runs per page change, not the COUNT.
    //
    // Invalidation: `create/update/remove/importSong` already call
    // `cacheService.invalidatePattern('songs:*')`, which clears both
    // the count and list buckets (and the existing recent/popular
    // buckets) under one prefix. No new invalidation sites needed.
    //
    // Caveat: cache is per-pod. Multi-pod deployments need a shared
    // cache (deferred — see CLAUDE.md).
    const total = await this.getCachedSongCount(q);
    const items = await this.getCachedSongPage(
      q,
      page,
      safeLimit,
      sortBy,
      sortOrder,
    );

    return {
      items,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private buildSongWhere(q: string | undefined): FindOptionsWhere<Song> {
    return q ? { name: Like(`%${q}%`) } : {};
  }

  /**
   * 5-min cached COUNT for a given query string. Without `q` we cache
   * the unfiltered total separately so `?q=` and the empty case don't
   * share a key. TTL matches `getRecentSongs`/`getPopularSongs`.
   */
  private async getCachedSongCount(q: string | undefined): Promise<number> {
    const cacheKey = q ? `songs:count:q=${q}` : 'songs:count:all';
    return this.cacheService.getOrSet(
      cacheKey,
      () => this.songRepository.count({ where: this.buildSongWhere(q) }),
      300,
    );
  }

  /**
   * 30-second cached page. Shorter than the COUNT cache because users
   * expect search results to feel fresh within a session. The slim
   * `select` drops fields the frontend's `SongDto` doesn't use
   * (spotifyUrl, albumImageUrl, previewUrl, plays, updatedAt, mappings)
   * — small absolute savings, but compounds across many pages.
   */
  private async getCachedSongPage(
    q: string | undefined,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
  ): Promise<Song[]> {
    const cacheKey = `songs:list:${JSON.stringify({ q, page, limit, sortBy, sortOrder })}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.songRepository.find({
          where: this.buildSongWhere(q),
          order: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            name: true,
            artist: true,
            releaseYear: true,
            spotifyTrackId: true,
            createdAt: true,
          },
        }),
      30,
    );
  }

  async findOne(id: string): Promise<Song> {
    const song = await this.songRepository.findOne({
      where: { id },
      relations: ['mappings', 'mappings.qrCode', 'mappings.qrCard'],
    });

    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }

    return song;
  }

  async update(id: string, updateSongDto: UpdateSongDto): Promise<Song> {
    const song = await this.findOne(id);

    // If Spotify Track ID is being updated, fetch new info
    if (
      updateSongDto.spotifyTrackId &&
      updateSongDto.spotifyTrackId !== song.spotifyTrackId
    ) {
      try {
        const spotifyInfo: SpotifyTrackInfo | null =
          await this.spotifyService.getTrackById(updateSongDto.spotifyTrackId);
        song.spotifyUrl = spotifyInfo?.spotifyUrl ?? '';
        // Song.previewUrl / albumImageUrl are typed `string` (not
        // nullable in the entity), so coerce the `null` from
        // Spotify to an empty string on assignment.
        song.albumImageUrl = spotifyInfo?.albumImage ?? '';
        song.previewUrl = spotifyInfo?.previewUrl ?? '';
        this.logger.log(`Updated Spotify info for song: ${song.name}`);
      } catch (error: unknown) {
        this.logger.warn(
          `Could not fetch Spotify info: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    Object.assign(song, updateSongDto);
    const updatedSong = await this.songRepository.save(song);
    this.cacheService.invalidatePattern('songs:*');
    this.logger.log(`Song updated: ${updatedSong.name}`);

    return updatedSong;
  }

  async remove(id: string): Promise<void> {
    const song = await this.findOne(id);
    await this.songRepository.remove(song);
    this.cacheService.invalidatePattern('songs:*');
    await this.notificationsService.create({
      type: 'song_deleted',
      category: 'content',
      severity: 'warning',
      title: 'Song deleted',
      message: `"${song.name}" by ${song.artist} was deleted.`,
      metadata: { songId: song.id },
    });
    this.logger.log(`Song deleted: ${song.name}`);
  }

  async incrementPlays(id: string): Promise<void> {
    await this.songRepository.increment({ id }, 'plays', 1);
    this.logger.debug(`Incremented plays for song ID: ${id}`);
  }

  async searchSpotify(query: string, limit: number = 10): Promise<any[]> {
    this.logger.log(`Searching Spotify for: ${query}`);
    return await this.spotifyService.searchTracks(query, limit);
  }

  async getPopularSongs(limit: number = 10): Promise<Song[]> {
    const cacheKey = `songs:popular:${limit}`;
    return await this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.songRepository.find({
          order: { plays: 'DESC' },
          take: limit,
          select: [
            'id',
            'name',
            'artist',
            'spotifyTrackId',
            'albumImageUrl',
            'plays',
            'createdAt',
          ],
        }),
      300, // Cache for 5 minutes
    );
  }

  async getRecentSongs(limit: number = 5): Promise<Song[]> {
    const cacheKey = `songs:recent:${limit}`;
    return await this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.songRepository.find({
          order: { createdAt: 'DESC' },
          take: limit,
          select: [
            'id',
            'name',
            'artist',
            'releaseYear',
            'spotifyTrackId',
            'albumImageUrl',
            'createdAt',
          ],
        }),
      300, // Cache for 5 minutes
    );
  }

  async exportSongsToXlsx(): Promise<Buffer> {
    const songs = await this.songRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Build an array-of-arrays worksheet. SheetJS treats each
    // top-level array as a row; cell types are inferred.
    const aoa: (string | number)[][] = [
      [
        'ID',
        'Name',
        'Artist',
        'Release Year',
        'Spotify Track ID',
        'Spotify URL',
        'Plays',
        'Created At',
      ],
      ...songs.map((song) => [
        song.id,
        song.name,
        song.artist,
        song.releaseYear,
        song.spotifyTrackId,
        song.spotifyUrl,
        song.plays,
        song.createdAt.toISOString(),
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Songs');

    // `bookType: 'xlsx'` + `type: 'buffer'` returns a Node `Buffer`
    // ready to send as the response body. The standard MIME type for
    // `.xlsx` is the long Open Office XML one.
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  }
}
