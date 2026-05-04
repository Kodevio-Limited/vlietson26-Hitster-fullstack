import * as express from 'express';
import { MappingsService } from '../mappings/mappings.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { SongsService } from '../songs/songs.service';
export declare class QrRedirectController {
    private readonly qrCodesService;
    private readonly mappingsService;
    private readonly songsService;
    private readonly logger;
    constructor(qrCodesService: QrCodesService, mappingsService: MappingsService, songsService: SongsService);
    redirect(identifier: string, res: express.Response): Promise<express.Response<any, Record<string, any>>>;
    getQrInfo(identifier: string): Promise<{
        success: boolean;
        data: {
            identifier: string;
            isActive: boolean;
            scans: number;
            createdAt: Date;
            song: import("../songs/entities/song.entity").Song | null;
        };
    }>;
}
