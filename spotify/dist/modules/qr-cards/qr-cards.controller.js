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
exports.QrCardsController = void 0;
const common_1 = require("@nestjs/common");
const qr_cards_service_1 = require("./qr-cards.service");
const create_qr_card_dto_1 = require("./dto/create-qr-card.dto");
const update_qr_card_dto_1 = require("./dto/update-qr-card.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const admin_guard_1 = require("../../common/guards/admin.guard");
let QrCardsController = class QrCardsController {
    qrCardsService;
    constructor(qrCardsService) {
        this.qrCardsService = qrCardsService;
    }
    async create(createQrCardDto) {
        const qrCard = await this.qrCardsService.create(createQrCardDto);
        return {
            success: true,
            message: 'QR card created successfully',
            data: qrCard,
        };
    }
    async findAll() {
        const qrCards = await this.qrCardsService.findAll();
        return {
            success: true,
            count: qrCards.length,
            data: qrCards,
        };
    }
    async getAvailable() {
        const cards = await this.qrCardsService.getAvailableCards();
        return {
            success: true,
            data: cards,
        };
    }
    async findOne(id) {
        const qrCard = await this.qrCardsService.findOne(id);
        return {
            success: true,
            data: qrCard,
        };
    }
    async update(id, updateQrCardDto) {
        const qrCard = await this.qrCardsService.update(id, updateQrCardDto);
        return {
            success: true,
            message: 'QR card updated successfully',
            data: qrCard,
        };
    }
    async remove(id) {
        await this.qrCardsService.remove(id);
        return {
            success: true,
            message: 'QR card deleted successfully',
        };
    }
};
exports.QrCardsController = QrCardsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_qr_card_dto_1.CreateQrCardDto]),
    __metadata("design:returntype", Promise)
], QrCardsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QrCardsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('available'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QrCardsController.prototype, "getAvailable", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QrCardsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_qr_card_dto_1.UpdateQrCardDto]),
    __metadata("design:returntype", Promise)
], QrCardsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QrCardsController.prototype, "remove", null);
exports.QrCardsController = QrCardsController = __decorate([
    (0, common_1.Controller)('qr-cards'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [qr_cards_service_1.QrCardsService])
], QrCardsController);
//# sourceMappingURL=qr-cards.controller.js.map