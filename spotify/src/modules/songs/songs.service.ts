import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Song } from './entities/song.entity';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SearchSongDto } from './dto/search-song.dto';
import { SpotifyService } from '../spotify/spotify.service';
import { CacheService } from '../../common/services/cache.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SongsService {
  private readonly logger = new Logger(SongsService.name);

  constructor(
    @InjectRepository(Song)
    private readonly songRepository: Repository<Song>,
    private readonly spotifyService: SpotifyService,
    private readonly cacheService: CacheService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createSongDto: CreateSongDto): Promise<Song> {
    // Check if song already exists
    const existingSong = await this.songRepository.findOne({
      where: { spotifyTrackId: createSongDto.spotifyTrackId },
    });

    if (existingSong) {
      throw new ConflictException('Song with this Spotify Track ID already exists');
    }

    // Fetch additional track info from Spotify
    let spotifyInfo: any = null;
    try {
      spotifyInfo = await this.spotifyService.getTrackById(createSongDto.spotifyTrackId);
      this.logger.log(`Fetched Spotify info for track: ${createSongDto.spotifyTrackId}`);
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

  async findAll(searchDto: SearchSongDto): Promise<{ items: Song[]; total: number; page: number; limit: number; totalPages: number }> {
    const { q, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto;
    const where: FindOptionsWhere<Song> = {};
    
    if (q) {
      where.name = Like(`%${q}%`);
    }

    const [items, total] = await this.songRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
    if (updateSongDto.spotifyTrackId && updateSongDto.spotifyTrackId !== song.spotifyTrackId) {
      try {
        const spotifyInfo = await this.spotifyService.getTrackById(updateSongDto.spotifyTrackId);
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
          select: ['id', 'name', 'artist', 'spotifyTrackId', 'albumImageUrl', 'plays', 'createdAt'],
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
          select: ['id', 'name', 'artist', 'releaseYear', 'spotifyTrackId', 'albumImageUrl', 'createdAt'],
        }),
      300, // Cache for 5 minutes
    );
  }
}
