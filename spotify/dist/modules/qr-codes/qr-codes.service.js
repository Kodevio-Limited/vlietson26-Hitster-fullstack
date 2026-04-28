"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var QrCodesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrCodesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const config_1 = require("@nestjs/config");
const QRCode = __importStar(require("qrcode"));
const qr_code_entity_1 = require("./entities/qr-code.entity");
let QrCodesService = QrCodesService_1 = class QrCodesService {
    qrCodeRepository;
    configService;
    logger = new common_1.Logger(QrCodesService_1.name);
    constructor(qrCodeRepository, configService) {
        this.qrCodeRepository = qrCodeRepository;
        this.configService = configService;
    }
    async generateQrCode(createDto) {
        const existing = await this.qrCodeRepository.findOne({
            where: { identifier: createDto.identifier },
        });
        if (existing) {
            throw new common_1.ConflictException(`QR Code with identifier ${createDto.identifier} already exists`);
        }
        let spotifyUrl = createDto.spotifyUrl;
        if (!spotifyUrl && createDto.spotifyTrackId) {
            spotifyUrl = `https://open.spotify.com/track/${createDto.spotifyTrackId}`;
        }
        if (!spotifyUrl) {
            throw new common_1.ConflictException('Either spotifyUrl or spotifyTrackId must be provided');
        }
        const qrOptions = {
            errorCorrectionLevel: 'M',
            margin: this.configService.get('qrCode.margin'),
            width: this.configService.get('qrCode.size'),
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        };
        const qrCodeDataUrl = await QRCode.toDataURL(spotifyUrl, qrOptions);
        const redirectUrl = `${this.configService.get('apiUrl')}/api/qr/redirect/${createDto.identifier}`;
        const qrCode = this.qrCodeRepository.create({
            identifier: createDto.identifier,
            code: spotifyUrl,
            imageUrl: qrCodeDataUrl,
            redirectUrl,
            isActive: true,
        });
        const savedQrCode = await this.qrCodeRepository.save(qrCode);
        this.logger.log(`QR Code generated: ${savedQrCode.identifier}`);
        return savedQrCode;
    }
    async findAll() {
        return await this.qrCodeRepository.find({
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id) {
        const qrCode = await this.qrCodeRepository.findOne({
            where: { id },
            relations: ['mappings', 'mappings.song', 'mappings.qrCard'],
            select: {
                id: true,
                identifier: true,
                code: true,
                imageUrl: true,
                redirectUrl: true,
                isActive: true,
                scans: true,
                createdAt: true,
            }
        });
        if (!qrCode) {
            throw new common_1.NotFoundException(`QR Code with ID ${id} not found`);
        }
        return qrCode;
    }
    async findByIdentifier(identifier) {
        const qrCode = await this.qrCodeRepository.findOne({
            where: { identifier },
            relations: ['mappings', 'mappings.song', 'mappings.qrCard'],
            select: {
                id: true,
                identifier: true,
                code: true,
                imageUrl: true,
                redirectUrl: true,
                isActive: true,
                scans: true,
                createdAt: true,
            }
        });
        if (!qrCode) {
            throw new common_1.NotFoundException(`QR Code with identifier ${identifier} not found`);
        }
        return qrCode;
    }
    async incrementScans(identifier) {
        await this.qrCodeRepository.increment({ identifier }, 'scans', 1);
        this.logger.debug(`Incremented scans for QR: ${identifier}`);
    }
    async deactivate(id) {
        const qrCode = await this.findOne(id);
        qrCode.isActive = false;
        const updated = await this.qrCodeRepository.save(qrCode);
        this.logger.log(`QR Code deactivated: ${qrCode.identifier}`);
        return updated;
    }
    async activate(id) {
        const qrCode = await this.findOne(id);
        qrCode.isActive = true;
        const updated = await this.qrCodeRepository.save(qrCode);
        this.logger.log(`QR Code activated: ${qrCode.identifier}`);
        return updated;
    }
    async remove(id) {
        const qrCode = await this.findOne(id);
        await this.qrCodeRepository.remove(qrCode);
        this.logger.log(`QR Code deleted: ${qrCode.identifier}`);
    }
    async getStats() {
        const total = await this.qrCodeRepository.count();
        const active = await this.qrCodeRepository.count({ where: { isActive: true } });
        const totalScans = await this.qrCodeRepository
            .createQueryBuilder('qr_code')
            .select('SUM(scans)', 'total')
            .getRawOne();
        return {
            total,
            active,
            inactive: total - active,
            totalScans: parseInt(totalScans.total) || 0,
        };
    }
};
exports.QrCodesService = QrCodesService;
exports.QrCodesService = QrCodesService = QrCodesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(qr_code_entity_1.QrCode)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        config_1.ConfigService])
], QrCodesService);
//# sourceMappingURL=qr-codes.service.js.map