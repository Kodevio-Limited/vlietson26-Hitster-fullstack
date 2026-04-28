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
exports.QrCodesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const qr_codes_service_1 = require("./qr-codes.service");
const create_qr_code_dto_1 = require("./dto/create-qr-code.dto");
let QrCodesController = class QrCodesController {
    qrCodesService;
    constructor(qrCodesService) {
        this.qrCodesService = qrCodesService;
    }
    async generate(createQrCodeDto) {
        const qrCode = await this.qrCodesService.generateQrCode(createQrCodeDto);
        return {
            success: true,
            message: 'QR code generated successfully',
            data: qrCode,
        };
    }
    async findAll() {
        const qrCodes = await this.qrCodesService.findAll();
        return {
            success: true,
            count: qrCodes.length,
            data: qrCodes,
        };
    }
    async getStats() {
        const stats = await this.qrCodesService.getStats();
        return {
            success: true,
            data: stats,
        };
    }
    async findOne(id) {
        const qrCode = await this.qrCodesService.findOne(id);
        return {
            success: true,
            data: qrCode,
        };
    }
    async deactivate(id) {
        const qrCode = await this.qrCodesService.deactivate(id);
        return {
            success: true,
            message: 'QR code deactivated',
            data: qrCode,
        };
    }
    async activate(id) {
        const qrCode = await this.qrCodesService.activate(id);
        return {
            success: true,
            message: 'QR code activated',
            data: qrCode,
        };
    }
    async remove(id) {
        await this.qrCodesService.remove(id);
        return {
            success: true,
            message: 'QR code deleted successfully',
        };
    }
};
exports.QrCodesController = QrCodesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_qr_code_dto_1.CreateQrCodeDto]),
    __metadata("design:returntype", Promise)
], QrCodesController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QrCodesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QrCodesController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QrCodesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QrCodesController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QrCodesController.prototype, "activate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QrCodesController.prototype, "remove", null);
exports.QrCodesController = QrCodesController = __decorate([
    (0, common_1.Controller)('qr-codes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [qr_codes_service_1.QrCodesService])
], QrCodesController);
//# sourceMappingURL=qr-codes.controller.js.map