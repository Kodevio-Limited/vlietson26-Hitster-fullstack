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
var QrCardsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrCardsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const qr_card_entity_1 = require("./entities/qr-card.entity");
let QrCardsService = QrCardsService_1 = class QrCardsService {
    qrCardRepository;
    logger = new common_1.Logger(QrCardsService_1.name);
    constructor(qrCardRepository) {
        this.qrCardRepository = qrCardRepository;
    }
    async create(createDto) {
        const existing = await this.qrCardRepository.findOne({
            where: { cardId: createDto.cardId },
        });
        if (existing) {
            throw new common_1.ConflictException(`QR Card with ID ${createDto.cardId} already exists`);
        }
        const qrCard = this.qrCardRepository.create({
            ...createDto,
            status: 'active',
        });
        const saved = await this.qrCardRepository.save(qrCard);
        this.logger.log(`QR Card created: ${saved.cardId}`);
        return saved;
    }
    async findAll() {
        return await this.qrCardRepository.find({
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const qrCard = await this.qrCardRepository.findOne({
            where: { id },
        });
        if (!qrCard) {
            throw new common_1.NotFoundException(`QR Card with ID ${id} not found`);
        }
        return qrCard;
    }
    async findByCardId(cardId) {
        const qrCard = await this.qrCardRepository.findOne({
            where: { cardId },
        });
        if (!qrCard) {
            throw new common_1.NotFoundException(`QR Card with cardId ${cardId} not found`);
        }
        return qrCard;
    }
    async update(id, updateDto) {
        const qrCard = await this.findOne(id);
        Object.assign(qrCard, updateDto);
        const updated = await this.qrCardRepository.save(qrCard);
        this.logger.log(`QR Card updated: ${updated.cardId}`);
        return updated;
    }
    async remove(id) {
        const qrCard = await this.findOne(id);
        await this.qrCardRepository.remove(qrCard);
        this.logger.log(`QR Card deleted: ${qrCard.cardId}`);
    }
    async getAvailableCards() {
        return await this.qrCardRepository.find({
            where: { status: 'active' },
            order: { cardId: 'ASC' },
        });
    }
};
exports.QrCardsService = QrCardsService;
exports.QrCardsService = QrCardsService = QrCardsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(qr_card_entity_1.QrCard)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], QrCardsService);
//# sourceMappingURL=qr-cards.service.js.map