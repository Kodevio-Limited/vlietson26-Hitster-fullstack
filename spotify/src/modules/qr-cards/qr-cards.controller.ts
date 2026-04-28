import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { QrCardsService } from './qr-cards.service';
import { CreateQrCardDto } from './dto/create-qr-card.dto';
import { UpdateQrCardDto } from './dto/update-qr-card.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('qr-cards')
@UseGuards(JwtAuthGuard, AdminGuard)
export class QrCardsController {
  constructor(private readonly qrCardsService: QrCardsService) {}

  @Post()
  async create(@Body() createQrCardDto: CreateQrCardDto) {
    const qrCard = await this.qrCardsService.create(createQrCardDto);
    return {
      success: true,
      message: 'QR card created successfully',
      data: qrCard,
    };
  }

  @Get()
  async findAll() {
    const qrCards = await this.qrCardsService.findAll();
    return {
      success: true,
      count: qrCards.length,
      data: qrCards,
    };
  }

  @Get('available')
  async getAvailable() {
    const cards = await this.qrCardsService.getAvailableCards();
    return {
      success: true,
      data: cards,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const qrCard = await this.qrCardsService.findOne(id);
    return {
      success: true,
      data: qrCard,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateQrCardDto: UpdateQrCardDto) {
    const qrCard = await this.qrCardsService.update(id, updateQrCardDto);
    return {
      success: true,
      message: 'QR card updated successfully',
      data: qrCard,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.qrCardsService.remove(id);
    return {
      success: true,
      message: 'QR card deleted successfully',
    };
  }
}
