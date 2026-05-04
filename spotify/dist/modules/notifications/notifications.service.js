"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("./entities/notification.entity");
let NotificationsService = class NotificationsService {
    notificationRepository;
    constructor(notificationRepository) {
        this.notificationRepository = notificationRepository;
    }
    async create(input) {
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
    async listForUser(userId, limit = 20) {
        const [items, unreadCount] = await Promise.all([
            this.notificationRepository.find({
                where: [{ userId }, { userId: (0, typeorm_2.IsNull)() }],
                order: { createdAt: 'DESC' },
                take: limit,
            }),
            this.notificationRepository.count({
                where: [
                    { userId, isRead: false },
                    { userId: (0, typeorm_2.IsNull)(), isRead: false },
                ],
            }),
        ]);
        return { items, unreadCount };
    }
    async markAllAsRead(userId) {
        await this.notificationRepository
            .createQueryBuilder()
            .update(notification_entity_1.Notification)
            .set({ isRead: true })
            .where('(user_id = :userId OR user_id IS NULL) AND is_read = false', { userId })
            .execute();
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map