import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BatchService } from './batch.service';

@Controller('batch')
@UseGuards(JwtAuthGuard)
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Get('dashboard')
  async getDashboardData(
    @Query('songPage') songPage: number = 1,
    @Query('songLimit') songLimit: number = 10,
    @Query('mappingPage') mappingPage: number = 1,
    @Query('mappingLimit') mappingLimit: number = 10,
  ) {
    return await this.batchService.getDashboardData(
      songPage,
      songLimit,
      mappingPage,
      mappingLimit,
    );
  }

  @Get('qr-mapping')
  async getQrMappingPageData(
    @Query('mappingPage') mappingPage: number = 1,
    @Query('mappingLimit') mappingLimit: number = 8,
    @Query('songLimit') songLimit: number = 100,
  ) {
    return await this.batchService.getQrMappingPageData(
      mappingPage,
      mappingLimit,
      songLimit,
    );
  }
}
