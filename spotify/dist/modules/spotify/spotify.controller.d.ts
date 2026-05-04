import { SpotifyService } from './spotify.service';
export declare class SpotifyController {
    private readonly spotifyService;
    constructor(spotifyService: SpotifyService);
    searchTracks(query: string, limit?: number): Promise<{
        success: boolean;
        query: string;
        count: number;
        data: any[];
    }>;
    getTrack(id: string): Promise<{
        success: boolean;
        data: any;
    }>;
    getSeveralTracks(ids: string): Promise<{
        success: boolean;
        count: number;
        data: any[];
    }>;
}
