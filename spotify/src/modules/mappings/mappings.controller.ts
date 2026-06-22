import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { MappingsService } from './mappings.service';
import { CreateMappingDto } from './dto/create-mapping.dto';

/**
 * Same shape as `JwtStrategy.validate()`'s return — only `.id` and
 * `.query` are read here. The guard chain (`JwtAuthGuard` then
 * `AdminGuard`) runs first, so `user` is always set.
 */
interface RequestWithUserAndQuery extends ExpressRequest {
  user: { id: string };
  query: Record<string, string | string[] | undefined>;
}

@Controller('mappings')
@UseGuards(JwtAuthGuard, AdminGuard)
export class MappingsController {
  constructor(private readonly mappingsService: MappingsService) {}

  @Post()
  async create(
    @Body() createMappingDto: CreateMappingDto,
    @Request() req: RequestWithUserAndQuery,
  ) {
    const mapping = await this.mappingsService.create(
      createMappingDto,
      req.user.id,
    );
    return {
      success: true,
      message: 'Mapping created successfully',
      data: mapping,
    };
  }

  @Get()
  async findAll(@Request() req: RequestWithUserAndQuery) {
    const page = parseInt(this.queryString(req.query.page) ?? '') || 1;
    const limit = Math.min(
      parseInt(this.queryString(req.query.limit) ?? '') || 10,
      100,
    );
    const result = await this.mappingsService.findAll(page, limit);
    return {
      success: true,
      data: result.items,
      total: result.total,
      page,
      limit,
    };
  }

  /**
   * `req.query` for `?foo=bar` gives `string`; for `?foo=a&foo=b`
   * gives `string[]`. Express types it as
   * `string | string[] | undefined`. The `?page=` and `?limit=`
   * params are always scalars, so pick the first element if we get
   * an array.
   */
  private queryString(
    value: string | string[] | undefined,
  ): string | undefined {
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
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
