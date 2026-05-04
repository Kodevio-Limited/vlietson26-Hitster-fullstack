import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MappingsService } from './mappings.service';
import { CreateMappingDto } from './dto/create-mapping.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('mappings')
@UseGuards(JwtAuthGuard)
export class MappingsController {
  constructor(private readonly mappingsService: MappingsService) {}

  @Post()
  async create(@Body() createMappingDto: CreateMappingDto, @Request() req) {
    const mapping = await this.mappingsService.create(createMappingDto, req.user.id);
    return {
      success: true,
      message: 'Mapping created successfully',
      data: mapping,
    };
  }

  @Get()
  async findAll(@Request() req) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const result = await this.mappingsService.findAll(page, limit);
    return {
      success: true,
      data: result.items,
      total: result.total,
      page,
      limit,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const mapping = await this.mappingsService.findOne(id);
    return {
      success: true,
      data: mapping,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMappingDto: Partial<CreateMappingDto>,
  ) {
    const mapping = await this.mappingsService.update(id, updateMappingDto);
    return {
      success: true,
      message: 'Mapping updated successfully',
      data: mapping,
    };
  }

  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    const mapping = await this.mappingsService.deactivate(id);
    return {
      success: true,
      message: 'Mapping deactivated',
      data: mapping,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.mappingsService.remove(id);
    return {
      success: true,
      message: 'Mapping deleted successfully',
    };
  }
}
