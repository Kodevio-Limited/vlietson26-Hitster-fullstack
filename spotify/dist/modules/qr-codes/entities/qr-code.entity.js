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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrCode = void 0;
const typeorm_1 = require("typeorm");
const mapping_entity_1 = require("../../mappings/entities/mapping.entity");
let QrCode = class QrCode {
    id;
    identifier;
    code;
    imageUrl;
    redirectUrl;
    isActive;
    scans;
    createdAt;
    mappings;
};
exports.QrCode = QrCode;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QrCode.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], QrCode.prototype, "identifier", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], QrCode.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', name: 'image_url', nullable: true, select: false }),
    __metadata("design:type", String)
], QrCode.prototype, "imageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, name: 'redirect_url' }),
    __metadata("design:type", String)
], QrCode.prototype, "redirectUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], QrCode.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], QrCode.prototype, "scans", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], QrCode.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => mapping_entity_1.Mapping, (mapping) => mapping.qrCode),
    __metadata("design:type", Array)
], QrCode.prototype, "mappings", void 0);
exports.QrCode = QrCode = __decorate([
    (0, typeorm_1.Entity)('qr_codes'),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['isActive'])
], QrCode);
//# sourceMappingURL=qr-code.entity.js.map