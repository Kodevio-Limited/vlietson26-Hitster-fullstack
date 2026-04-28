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
exports.Mapping = void 0;
const typeorm_1 = require("typeorm");
const song_entity_1 = require("../../songs/entities/song.entity");
const qr_code_entity_1 = require("../../qr-codes/entities/qr-code.entity");
const qr_card_entity_1 = require("../../qr-cards/entities/qr-card.entity");
const user_entity_1 = require("../../auth/entities/user.entity");
let Mapping = class Mapping {
    id;
    songId;
    qrCodeId;
    qrCardId;
    createdById;
    isActive;
    createdAt;
    song;
    qrCode;
    qrCard;
    createdBy;
};
exports.Mapping = Mapping;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Mapping.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'song_id', type: 'uuid' }),
    __metadata("design:type", String)
], Mapping.prototype, "songId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'qr_code_id', type: 'uuid' }),
    __metadata("design:type", String)
], Mapping.prototype, "qrCodeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'qr_card_id', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Mapping.prototype, "qrCardId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], Mapping.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], Mapping.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Mapping.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => song_entity_1.Song, (song) => song.mappings),
    (0, typeorm_1.JoinColumn)({ name: 'song_id' }),
    __metadata("design:type", song_entity_1.Song)
], Mapping.prototype, "song", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => qr_code_entity_1.QrCode, (qrCode) => qrCode.mappings),
    (0, typeorm_1.JoinColumn)({ name: 'qr_code_id' }),
    __metadata("design:type", qr_code_entity_1.QrCode)
], Mapping.prototype, "qrCode", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => qr_card_entity_1.QrCard),
    (0, typeorm_1.JoinColumn)({ name: 'qr_card_id' }),
    __metadata("design:type", qr_card_entity_1.QrCard)
], Mapping.prototype, "qrCard", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], Mapping.prototype, "createdBy", void 0);
exports.Mapping = Mapping = __decorate([
    (0, typeorm_1.Entity)('mappings'),
    (0, typeorm_1.Index)(['songId', 'qrCodeId'], { unique: true }),
    (0, typeorm_1.Index)(['songId']),
    (0, typeorm_1.Index)(['qrCodeId']),
    (0, typeorm_1.Index)(['isActive']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['createdById'])
], Mapping);
//# sourceMappingURL=mapping.entity.js.map