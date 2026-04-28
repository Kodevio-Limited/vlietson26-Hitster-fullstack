import { BatchService } from './batch.service';
export declare class BatchController {
    private readonly batchService;
    constructor(batchService: BatchService);
    getDashboardData(songPage?: number, songLimit?: number, mappingPage?: number, mappingLimit?: number): Promise<import("./batch.service").BatchDataResponse>;
    getQrMappingPageData(mappingPage?: number, mappingLimit?: number, songLimit?: number): Promise<import("./batch.service").BatchDataResponse>;
}
