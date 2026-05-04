import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QrCodesService } from './qr-codes.service';
import { CreateQrCodeDto } from './dto/create-qr-code.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('qr-codes')
@UseGuards(JwtAuthGuard)
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Post()
  async generate(@Body() createQrCodeDto: CreateQrCodeDto) {
    const qrCode = await this.qrCodesService.generateQrCode(createQrCodeDto);
    return {
      success: true,
      message: 'QR code generated successfully',
      data: qrCode,
    };
  }

  @Get()
  async findAll() {
    const qrCodes = await this.qrCodesService.findAll();
    return {
      success: true,
      count: qrCodes.length,
      data: qrCodes,
    };
  }

  @Get('stats')
  async getStats() {
    const stats = await this.qrCodesService.getStats();
    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const qrCode = await this.qrCodesService.findOne(id);
    return {
      success: true,
      data: qrCode,
    };
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const qrCode = await this.qrCodesService.deactivate(id);
    return {
      success: true,
      message: 'QR code deactivated',
      data: qrCode,
    };
  }

  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    const qrCode = await this.qrCodesService.activate(id);
    return {
      success: true,
      message: 'QR code activated',
      data: qrCode,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.qrCodesService.remove(id);
    return {
      success: true,
      message: 'QR code deleted successfully',
    };
  }
}
