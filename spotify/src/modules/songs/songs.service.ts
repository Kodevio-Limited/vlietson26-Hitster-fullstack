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
import { SpotifyService } from '../spotify/spotify.service';
import { CacheService } from '../../common/services/cache.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { MappingsService } from '../mappings/mappings.service';
import { randomUUID } from 'crypto';

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
    let spotifyInfo: any = null;
    try {
      spotifyInfo = await this.spotifyService.getTrackById(
        createSongDto.spotifyTrackId,
      );
      this.logger.log(
        `Fetched Spotify info for track: ${createSongDto.spotifyTrackId}`,
      );
    } catch (error) {
      this.logger.warn(`Could not fetch Spotify info: ${error.message}`);
    }

    const song = this.songRepository.create({
      ...createSongDto,
      spotifyUrl: spotifyInfo?.spotifyUrl,
      albumImageUrl: spotifyInfo?.albumImage,
      previewUrl: spotifyInfo?.previewUrl,
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
    let spotifyInfo: any = null;
    try {
      spotifyInfo = await this.spotifyService.getTrackById(trackId);
    } catch (error) {
      throw new ConflictException(
        `Could not fetch info from Spotify: ${error.message}`,
      );
    }

    let releaseYear = new Date().getFullYear();
    if (spotifyInfo.album && spotifyInfo.album.release_date) {
      const yearMatch = spotifyInfo.album.release_date.match(/^(\d{4})/);
      if (yearMatch) {
        releaseYear = parseInt(yearMatch[1], 10);
      }
    } else if (spotifyInfo.albumId) {
      releaseYear = new Date().getFullYear(); // Fallback if no album release date is given by simple track fetch
    }

    song = this.songRepository.create({
      name: spotifyInfo.name,
      artist: spotifyInfo.artist,
      releaseYear: releaseYear,
      spotifyTrackId: trackId,
      spotifyUrl: spotifyInfo.spotifyUrl,
      albumImageUrl: spotifyInfo.albumImage,
      previewUrl: spotifyInfo.previewUrl,
      plays: 0,
    });

    const savedSong = await this.songRepository.save(song);

    // Generate QR Code
    const identifier = randomUUID().replace(/-/g, '').substring(0, 10);
    const qrCode = await this.qrCodesService.generateQrCode({
      identifier,
      spotifyUrl: spotifyInfo.spotifyUrl,
      spotifyTrackId: trackId,
    });

    // Create Mapping
    await this.mappingsService.create(
      {
        songId: savedSong.id,
        qrCodeId: qrCode.id,
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
      } catch (error) {
        failed++;
        errors.push(`Failed to import ${url}: ${error.message}`);
        this.logger.warn(`Bulk import failed for URL ${url}: ${error.message}`);
      }
    }

    return { successful, failed, errors };
  }

  async regenerateQrCode(songId: string, userId: string): Promise<any> {
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

    // Create new Mapping
    await this.mappingsService.create(
      {
        songId: song.id,
        qrCodeId: newQrCode.id,
      },
      userId,
    );

    return newQrCode;
  }

  async getSongQrCode(songId: string): Promise<any> {
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
    const where: FindOptionsWhere<Song> = {};

    if (q) {
      where.name = Like(`%${q}%`);
    }

    const [items, total] = await this.songRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      items,
      total,
      page,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
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
        const spotifyInfo = await this.spotifyService.getTrackById(
          updateSongDto.spotifyTrackId,
        );
        song.spotifyUrl = spotifyInfo?.spotifyUrl;
        song.albumImageUrl = spotifyInfo?.albumImage;
        song.previewUrl = spotifyInfo?.previewUrl;
        this.logger.log(`Updated Spotify info for song: ${song.name}`);
      } catch (error) {
        this.logger.warn(`Could not fetch Spotify info: ${error.message}`);
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

  async exportSongsToCsv(): Promise<string> {
    const songs = await this.songRepository.find({
      order: { createdAt: 'DESC' },
    });

    const header = [
      'ID',
      'Name',
      'Artist',
      'Release Year',
      'Spotify Track ID',
      'Spotify URL',
      'Plays',
      'Created At',
    ];
    const rows = songs.map((song) => [
      song.id,
      `"${song.name.replace(/"/g, '""')}"`,
      `"${song.artist.replace(/"/g, '""')}"`,
      song.releaseYear,
      song.spotifyTrackId,
      song.spotifyUrl,
      song.plays,
      song.createdAt.toISOString(),
    ]);

    return [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }
}
