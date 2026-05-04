import { Repository } from 'typeorm';
import { Song } from './entities/song.entity';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SearchSongDto } from './dto/search-song.dto';
import { SpotifyService } from '../spotify/spotify.service';
import { CacheService } from '../../common/services/cache.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class SongsService {
    private readonly songRepository;
    private readonly spotifyService;
    private readonly cacheService;
    private readonly notificationsService;
    private readonly logger;
    constructor(songRepository: Repository<Song>, spotifyService: SpotifyService, cacheService: CacheService, notificationsService: NotificationsService);
    create(createSongDto: CreateSongDto): Promise<Song>;
    findAll(searchDto: SearchSongDto): Promise<{
        items: Song[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<Song>;
    update(id: string, updateSongDto: UpdateSongDto): Promise<Song>;
    remove(id: string): Promise<void>;
    incrementPlays(id: string): Promise<void>;
    searchSpotify(query: string, limit?: number): Promise<any[]>;
    getPopularSongs(limit?: number): Promise<Song[]>;
    getRecentSongs(limit?: number): Promise<Song[]>;
}
