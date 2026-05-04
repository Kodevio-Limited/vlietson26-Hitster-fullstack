import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SearchSongDto } from './dto/search-song.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() createSongDto: CreateSongDto, @Request() req) {
    const song = await this.songsService.create(createSongDto);
    return {
      success: true,
      message: 'Song created successfully',
      data: song,
    };
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
  async searchSpotify(@Query('q') query: string, @Query('limit') limit: number = 10) {
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
