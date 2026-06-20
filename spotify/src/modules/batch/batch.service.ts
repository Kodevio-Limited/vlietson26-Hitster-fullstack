import { Injectable } from '@nestjs/common';
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

@Injectable()
export class BatchService {
  constructor(
    private readonly songsService: SongsService,
    private readonly mappingsService: MappingsService,
    private readonly qrCodesService: QrCodesService,
  ) {}

  async getDashboardData(
    songPage: number = 1,
    songLimit: number = 10,
    mappingPage: number = 1,
    mappingLimit: number = 10,
  ): Promise<BatchDataResponse> {
    // Fetch all data in parallel
    const [songsData, mappingsData] = await Promise.all([
      this.songsService.findAll({
        page: songPage,
        limit: songLimit,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      }),
      this.mappingsService.findAll(mappingPage, mappingLimit),
    ]);

    return {
      success: true,
      data: {
        songs: songsData,
        mappings: {
          total: mappingsData.total,
          data: mappingsData.items,
        },
        qrCodes: {
          data: [],
        },
      },
    };
  }

  async getQrMappingPageData(
    mappingPage: number = 1,
    mappingLimit: number = 8,
    songLimit: number = 100,
  ): Promise<BatchDataResponse> {
    // Fetch data needed for QR mapping page
    const [mappingsData, songsData, qrCodesData] = await Promise.all([
      this.mappingsService.findAll(mappingPage, mappingLimit),
      this.songsService.findAll({
        page: 1,
        limit: songLimit,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      }),
      this.qrCodesService.findAll(),
    ]);

    return {
      success: true,
      data: {
        mappings: {
          total: mappingsData.total,
          data: mappingsData.items,
        },
        songs: songsData,
        qrCodes: {
          data: qrCodesData,
        },
      },
    };
  }
}
