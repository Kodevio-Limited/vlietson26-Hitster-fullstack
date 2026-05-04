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
exports.MappingsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const mappings_service_1 = require("./mappings.service");
const create_mapping_dto_1 = require("./dto/create-mapping.dto");
let MappingsController = class MappingsController {
    mappingsService;
    constructor(mappingsService) {
        this.mappingsService = mappingsService;
    }
    async create(createMappingDto, req) {
        const mapping = await this.mappingsService.create(createMappingDto, req.user.id);
        return {
            success: true,
            message: 'Mapping created successfully',
            data: mapping,
        };
    }
    async findAll(req) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await this.mappingsService.findAll(page, limit);
        return {
            success: true,
            data: result.items,
            total: result.total,
            page,
            limit,
        };
    }
    async findOne(id) {
        const mapping = await this.mappingsService.findOne(id);
        return {
            success: true,
            data: mapping,
        };
    }
    async update(id, updateMappingDto) {
        const mapping = await this.mappingsService.update(id, updateMappingDto);
        return {
            success: true,
            message: 'Mapping updated successfully',
            data: mapping,
        };
    }
    async deactivate(id) {
        const mapping = await this.mappingsService.deactivate(id);
        return {
            success: true,
            message: 'Mapping deactivated',
            data: mapping,
        };
    }
    async remove(id) {
        await this.mappingsService.remove(id);
        return {
            success: true,
            message: 'Mapping deleted successfully',
        };
    }
};
exports.MappingsController = MappingsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_mapping_dto_1.CreateMappingDto, Object]),
    __metadata("design:returntype", Promise)
], MappingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MappingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MappingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MappingsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MappingsController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MappingsController.prototype, "remove", null);
exports.MappingsController = MappingsController = __decorate([
    (0, common_1.Controller)('mappings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [mappings_service_1.MappingsService])
], MappingsController);
//# sourceMappingURL=mappings.controller.js.map