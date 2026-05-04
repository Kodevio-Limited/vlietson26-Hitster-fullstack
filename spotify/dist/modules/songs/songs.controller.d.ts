import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SearchSongDto } from './dto/search-song.dto';
export declare class SongsController {
    private readonly songsService;
    constructor(songsService: SongsService);
    create(createSongDto: CreateSongDto, req: any): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/song.entity").Song;
    }>;
    findAll(searchDto: SearchSongDto): Promise<{
        items: import("./entities/song.entity").Song[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        success: boolean;
    }>;
    searchSpotify(query: string, limit?: number): Promise<{
        success: boolean;
        query: string;
        count: number;
        data: any[];
    }>;
    getPopularSongs(limit?: number): Promise<{
        success: boolean;
        data: import("./entities/song.entity").Song[];
    }>;
    getRecentSongs(limit?: number): Promise<{
        success: boolean;
        data: import("./entities/song.entity").Song[];
    }>;
    findOne(id: string): Promise<{
        success: boolean;
        data: import("./entities/song.entity").Song;
    }>;
    update(id: string, updateSongDto: UpdateSongDto): Promise<{
        success: boolean;
        message: string;
        data: import("./entities/song.entity").Song;
    }>;
    remove(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
