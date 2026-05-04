export declare class Notification {
    id: string;
    userId?: string;
    type: string;
    category: string;
    severity: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    createdAt: Date;
}
