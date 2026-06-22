import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SearchSongDto } from './dto/search-song.dto';
import { ImportSongDto } from './dto/import-song.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

/**
 * The user payload `JwtStrategy.validate()` attaches to `req.user`.
 * We only need `.id` here, but typing it (instead of leaving the
 * `Request` default of `any`) lets the rest of the controller avoid
 * unsafe-assignment / unsafe-member-access lint hits.
 *
 * `user` is typed as required, not optional. Every route that uses
 * `req: RequestWithUser` is wrapped in `JwtAuthGuard`, which
 * guarantees `req.user` is set by the time the handler runs.
 */
interface RequestWithUser extends ExpressRequest {
  user: { id: string };
}

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() createSongDto: CreateSongDto) {
    const song = await this.songsService.create(createSongDto);
    return {
      success: true,
      message: 'Song created successfully',
      data: song,
    };
  }

  @Post('import')
  @UseGuards(AdminGuard)
  async importSong(
    @Body() importSongDto: ImportSongDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    const song = await this.songsService.importSong(
      importSongDto.spotifyUrl,
      userId,
    );
    return {
      success: true,
      message: 'Song imported successfully',
      data: song,
    };
  }

  @Post('import/bulk')
  @UseGuards(AdminGuard)
  async importSongsBulk(
    @Body() body: { urls: string[] },
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    const result = await this.songsService.importSongsBulk(body.urls, userId);
    return {
      success: true,
      message: `Bulk import completed. Successful: ${result.successful}, Failed: ${result.failed}`,
      data: result,
    };
  }

  @Post(':id/qr/regenerate')
  @UseGuards(AdminGuard)
  async regenerateQrCode(
    @Param('id') id: string,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    const qrCode = await this.songsService.regenerateQrCode(id, userId);
    return {
      success: true,
      message: 'QR Code regenerated successfully',
      data: qrCode,
    };
  }

  @Get(':id/qr')
  async getQrCode(@Param('id') id: string) {
    const song = await this.songsService.findOne(id);
    const mapping = song.mappings?.find((m) => m.isActive);
    if (!mapping || !mapping.qrCode) {
      return {
        success: false,
        message: 'No active QR code found for this song',
      };
    }
    const qrCode = await this.songsService.getSongQrCode(id);
    return {
      success: true,
      data: qrCode,
    };
  }

  @Get('export/xlsx')
  @UseGuards(AdminGuard)
  async exportXlsx(@Res() res: Response) {
    const buffer = await this.songsService.exportSongsToXlsx();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=songs_export.xlsx',
    );
    res.send(buffer);
  }

  @Get()
  async findAll(@Query() searchDto: SearchSongDto) {
    const result = await this.songsService.findAll(searchDto);
    return {
      success: true,
      ...result,
    };
  }

  @Get('spotify/search')
  async searchSpotify(
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
  ) {
    const results = await this.songsService.searchSpotify(query, limit);
    return {
      success: true,
      query,
      count: results.length,
      data: results,
    };
  }

  @Get('popular')
  async getPopularSongs(@Query('limit') limit: number = 10) {
    const songs = await this.songsService.getPopularSongs(limit);
    return {
      success: true,
      data: songs,
    };
  }

  @Get('recent')
  async getRecentSongs(@Query('limit') limit: number = 5) {
    const songs = await this.songsService.getRecentSongs(limit);
    return {
      success: true,
      data: songs,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const song = await this.songsService.findOne(id);
    return {
      success: true,
      data: song,
    };
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(@Param('id') id: string, @Body() updateSongDto: UpdateSongDto) {
    const song = await this.songsService.update(id, updateSongDto);
    return {
      success: true,
      message: 'Song updated successfully',
      data: song,
    };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.songsService.remove(id);
    return {
      success: true,
      message: 'Song deleted successfully',
    };
  }
}
