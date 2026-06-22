import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

/**
 * Same shape as `JwtStrategy.validate()`'s return — only `.id` is
 * read here. `JwtAuthGuard` runs first, so `user` is always set.
 */
interface RequestWithUser extends ExpressRequest {
  user: { id: string };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Request() req: RequestWithUser, @Query('limit') limit?: string) {
    const resolvedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const result = await this.notificationsService.listForUser(
      req.user.id,
      resolvedLimit,
    );

    return {
      success: true,
      unreadCount: result.unreadCount,
      data: result.items,
    };
  }

  @Post('read-all')
  async readAll(@Request() req: RequestWithUser) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }
}
