import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    list(req: any, limit?: string): Promise<{
        success: boolean;
        unreadCount: number;
        data: import("./entities/notification.entity").Notification[];
    }>;
    readAll(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
