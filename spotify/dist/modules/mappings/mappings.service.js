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
var MappingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MappingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const mapping_entity_1 = require("./entities/mapping.entity");
const songs_service_1 = require("../songs/songs.service");
const qr_codes_service_1 = require("../qr-codes/qr-codes.service");
const qr_cards_service_1 = require("../qr-cards/qr-cards.service");
const notifications_service_1 = require("../notifications/notifications.service");
let MappingsService = MappingsService_1 = class MappingsService {
    mappingRepository;
    songsService;
    qrCodesService;
    qrCardsService;
    notificationsService;
    logger = new common_1.Logger(MappingsService_1.name);
    constructor(mappingRepository, songsService, qrCodesService, qrCardsService, notificationsService) {
        this.mappingRepository = mappingRepository;
        this.songsService = songsService;
        this.qrCodesService = qrCodesService;
        this.qrCardsService = qrCardsService;
        this.notificationsService = notificationsService;
    }
    async create(createMappingDto, userId) {
        const song = await this.songsService.findOne(createMappingDto.songId);
        const qrCode = await this.qrCodesService.findOne(createMappingDto.qrCodeId);
        const existing = await this.mappingRepository.findOne({
            where: {
                songId: createMappingDto.songId,
                qrCodeId: createMappingDto.qrCodeId,
            },
        });
        if (existing) {
            throw new common_1.ConflictException('Mapping already exists for this song and QR code');
        }
        let qrCard = null;
        if (createMappingDto.qrCardId) {
            qrCard = await this.qrCardsService.findOne(createMappingDto.qrCardId);
        }
        const mapping = this.mappingRepository.create({
            songId: song.id,
            qrCodeId: qrCode.id,
            qrCardId: qrCard?.id,
            createdById: userId,
            isActive: true,
        });
        const savedMapping = await this.mappingRepository.save(mapping);
        await this.notificationsService.create({
            type: 'mapping_created',
            category: 'content',
            title: 'QR mapping created',
            message: `QR ${qrCode.identifier} mapped to "${song.name}".`,
            metadata: { mappingId: savedMapping.id, songId: song.id, qrCodeId: qrCode.id },
        });
        this.logger.log(`Mapping created: Song "${song.name}" -> QR Code "${qrCode.identifier}"`);
        return savedMapping;
    }
    async update(id, updateMappingDto) {
        const mapping = await this.findOne(id);
        if (updateMappingDto.songId) {
            const song = await this.songsService.findOne(updateMappingDto.songId);
            mapping.songId = song.id;
        }
        if (updateMappingDto.qrCodeId) {
            const qrCode = await this.qrCodesService.findOne(updateMappingDto.qrCodeId);
            mapping.qrCodeId = qrCode.id;
        }
        if (updateMappingDto.qrCardId) {
            const qrCard = await this.qrCardsService.findOne(updateMappingDto.qrCardId);
            mapping.qrCardId = qrCard.id;
        }
        const updated = await this.mappingRepository.save(mapping);
        this.logger.log(`Mapping updated: ${id}`);
        return this.findOne(updated.id);
    }
    async findAll(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const [items, total] = await this.mappingRepository.findAndCount({
            relations: ['song', 'qrCode'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });
        return { items, total };
    }
    async findOne(id) {
        const mapping = await this.mappingRepository.findOne({
            where: { id },
            relations: ['song', 'qrCode', 'qrCard', 'createdBy'],
        });
        if (!mapping) {
            throw new common_1.NotFoundException(`Mapping with ID ${id} not found`);
        }
        return mapping;
    }
    async findByQrCard(cardId) {
        return await this.mappingRepository.find({
            where: { qrCardId: cardId, isActive: true },
            relations: ['song', 'qrCode'],
        });
    }
    async findBySong(songId) {
        return await this.mappingRepository.find({
            where: { songId, isActive: true },
            relations: ['qrCode', 'qrCard'],
        });
    }
    async deactivate(id) {
        const mapping = await this.findOne(id);
        mapping.isActive = false;
        const updated = await this.mappingRepository.save(mapping);
        this.logger.log(`Mapping deactivated: ${id}`);
        return updated;
    }
    async remove(id) {
        const mapping = await this.findOne(id);
        const mappingSongName = mapping.song?.name ?? mapping.songId;
        const mappingQrIdentifier = mapping.qrCode?.identifier ?? mapping.qrCodeId;
        await this.mappingRepository.remove(mapping);
        await this.notificationsService.create({
            type: 'mapping_deleted',
            category: 'content',
            severity: 'warning',
            title: 'QR mapping deleted',
            message: `Mapping removed: QR ${mappingQrIdentifier} from "${mappingSongName}".`,
            metadata: { mappingId: id, songId: mapping.songId, qrCodeId: mapping.qrCodeId },
        });
        this.logger.log(`Mapping deleted: ${id}`);
    }
    async getActiveMappingByQrIdentifier(identifier) {
        const qrCode = await this.qrCodesService.findByIdentifier(identifier);
        const mapping = await this.mappingRepository.findOne({
            where: {
                qrCodeId: qrCode.id,
                isActive: true,
            },
            relations: ['song', 'qrCode'],
        });
        return mapping;
    }
};
exports.MappingsService = MappingsService;
exports.MappingsService = MappingsService = MappingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(mapping_entity_1.Mapping)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        songs_service_1.SongsService,
        qr_codes_service_1.QrCodesService,
        qr_cards_service_1.QrCardsService,
        notifications_service_1.NotificationsService])
], MappingsService);
//# sourceMappingURL=mappings.service.js.map