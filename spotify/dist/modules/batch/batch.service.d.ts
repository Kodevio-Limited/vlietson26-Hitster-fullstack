import { SongsService } from '../songs/songs.service';
import { MappingsService } from '../mappings/mappings.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
export interface BatchDataResponse {
    success: boolean;
    data: {
        songs: any;
        mappings: any;
        qrCodes: any;
    };
}
export declare class BatchService {
    private readonly songsService;
    private readonly mappingsService;
    private readonly qrCodesService;
    constructor(songsService: SongsService, mappingsService: MappingsService, qrCodesService: QrCodesService);
    getDashboardData(songPage?: number, songLimit?: number, mappingPage?: number, mappingLimit?: number): Promise<BatchDataResponse>;
    getQrMappingPageData(mappingPage?: number, mappingLimit?: number, songLimit?: number): Promise<BatchDataResponse>;
}
