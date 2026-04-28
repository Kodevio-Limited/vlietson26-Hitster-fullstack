import { Repository } from 'typeorm';
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
export declare class NotificationsService {
    private readonly notificationRepository;
    constructor(notificationRepository: Repository<Notification>);
    create(input: CreateNotificationInput): Promise<Notification>;
    listForUser(userId: string, limit?: number): Promise<{
        items: Notification[];
        unreadCount: number;
    }>;
    markAllAsRead(userId: string): Promise<void>;
}
export {};
