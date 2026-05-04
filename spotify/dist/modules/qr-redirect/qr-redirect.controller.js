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
var QrRedirectController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrRedirectController = void 0;
const common_1 = require("@nestjs/common");
const express = __importStar(require("express"));
const mappings_service_1 = require("../mappings/mappings.service");
const qr_codes_service_1 = require("../qr-codes/qr-codes.service");
const songs_service_1 = require("../songs/songs.service");
let QrRedirectController = QrRedirectController_1 = class QrRedirectController {
    qrCodesService;
    mappingsService;
    songsService;
    logger = new common_1.Logger(QrRedirectController_1.name);
    constructor(qrCodesService, mappingsService, songsService) {
        this.qrCodesService = qrCodesService;
        this.mappingsService = mappingsService;
        this.songsService = songsService;
    }
    async redirect(identifier, res) {
        try {
            this.logger.log(`QR Code scanned: ${identifier}`);
            const qrCode = await this.qrCodesService.findByIdentifier(identifier);
            if (!qrCode.isActive) {
                this.logger.warn(`Inactive QR code scanned: ${identifier}`);
                return res.status(common_1.HttpStatus.GONE).json({
                    success: false,
                    error: 'This QR code has been deactivated',
                    code: 'QR_INACTIVE',
                });
            }
            await this.qrCodesService.incrementScans(identifier);
            const mapping = await this.mappingsService.getActiveMappingByQrIdentifier(identifier);
            let songInfo = null;
            if (mapping && mapping.song) {
                await this.songsService.incrementPlays(mapping.song.id);
                songInfo = {
                    id: mapping.song.id,
                    name: mapping.song.name,
                    artist: mapping.song.artist,
                    releaseYear: mapping.song.releaseYear,
                    spotifyTrackId: mapping.song.spotifyTrackId,
                    albumImageUrl: mapping.song.albumImageUrl,
                    previewUrl: mapping.song.previewUrl,
                };
                this.logger.log(`QR ${identifier} mapped to song: ${mapping.song.name} by ${mapping.song.artist}`);
            }
            return res.json({
                success: true,
                spotifyUrl: qrCode.code,
                spotifyTrackId: songInfo?.spotifyTrackId,
                song: songInfo,
                redirectUrl: qrCode.code,
                timestamp: new Date().toISOString(),
            });
        }
        catch (error) {
            const err = error;
            const status = err.status || common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            if (status === 404) {
                this.logger.warn(`QR code not found: ${identifier}`);
                return res.status(common_1.HttpStatus.NOT_FOUND).json({
                    success: false,
                    error: 'QR code not found',
                    code: 'QR_NOT_FOUND',
                });
            }
            this.logger.error(`Error processing QR code ${identifier}:`, err.message);
            return res.status(status).json({
                success: false,
                error: err.message || 'Internal server error',
                code: 'SERVER_ERROR',
            });
        }
    }
    async getQrInfo(identifier) {
        const qrCode = await this.qrCodesService.findByIdentifier(identifier);
        const mapping = await this.mappingsService.getActiveMappingByQrIdentifier(identifier);
        return {
            success: true,
            data: {
                identifier: qrCode.identifier,
                isActive: qrCode.isActive,
                scans: qrCode.scans,
                createdAt: qrCode.createdAt,
                song: mapping?.song || null,
            },
        };
    }
};
exports.QrRedirectController = QrRedirectController;
__decorate([
    (0, common_1.Get)('redirect/:identifier'),
    __param(0, (0, common_1.Param)('identifier')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], QrRedirectController.prototype, "redirect", null);
__decorate([
    (0, common_1.Get)('info/:identifier'),
    __param(0, (0, common_1.Param)('identifier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QrRedirectController.prototype, "getQrInfo", null);
exports.QrRedirectController = QrRedirectController = QrRedirectController_1 = __decorate([
    (0, common_1.Controller)('qr'),
    __metadata("design:paramtypes", [qr_codes_service_1.QrCodesService,
        mappings_service_1.MappingsService,
        songs_service_1.SongsService])
], QrRedirectController);
//# sourceMappingURL=qr-redirect.controller.js.map