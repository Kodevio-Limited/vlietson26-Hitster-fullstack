import { Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Request() req, @Query('limit') limit?: string) {
    const resolvedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const result = await this.notificationsService.listForUser(req.user.id, resolvedLimit);

    return {
      success: true,
      unreadCount: result.unreadCount,
      data: result.items,
    };
  }

  @Post('read-all')
  async readAll(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }
}