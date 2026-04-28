import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Notification } from './entities/notification.entity';

type CreateNotificationInput = {
  userId?: string;
  type: string;
  category: 'security' | 'content';
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(input: CreateNotificationInput): Promise<Notification> {
    const item = this.notificationRepository.create({
      userId: input.userId,
      type: input.type,
      category: input.category,
      severity: input.severity ?? 'info',
      title: input.title,
      message: input.message,
      metadata: input.metadata,
      isRead: false,
    });

    return this.notificationRepository.save(item);
  }

  async listForUser(userId: string, limit = 20): Promise<{ items: Notification[]; unreadCount: number }> {
    const [items, unreadCount] = await Promise.all([
      this.notificationRepository.find({
        where: [{ userId }, { userId: IsNull() }],
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      this.notificationRepository.count({
        where: [
          { userId, isRead: false },
          { userId: IsNull(), isRead: false },
        ],
      }),
    ]);

    return { items, unreadCount };
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('(user_id = :userId OR user_id IS NULL) AND is_read = false', { userId })
      .execute();
  }
}