import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class SpotifyService {
    private readonly httpService;
    private readonly configService;
    private accessToken;
    private tokenExpiry;
    private readonly logger;
    constructor(httpService: HttpService, configService: ConfigService);
    private getAccessToken;
    searchTracks(query: string, limit?: number): Promise<any[]>;
    getTrackById(trackId: string): Promise<any>;
    getSeveralTracks(trackIds: string[]): Promise<any[]>;
    getAlbumTracks(albumId: string): Promise<any[]>;
    private formatDuration;
}
