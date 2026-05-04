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
exports.BatchService = void 0;
const common_1 = require("@nestjs/common");
const songs_service_1 = require("../songs/songs.service");
const mappings_service_1 = require("../mappings/mappings.service");
const qr_codes_service_1 = require("../qr-codes/qr-codes.service");
let BatchService = class BatchService {
    songsService;
    mappingsService;
    qrCodesService;
    constructor(songsService, mappingsService, qrCodesService) {
        this.songsService = songsService;
        this.mappingsService = mappingsService;
        this.qrCodesService = qrCodesService;
    }
    async getDashboardData(songPage = 1, songLimit = 10, mappingPage = 1, mappingLimit = 10) {
        const [songsData, mappingsData, qrCodesData] = await Promise.all([
            this.songsService.findAll({
                page: songPage,
                limit: songLimit,
                sortBy: 'createdAt',
                sortOrder: 'DESC',
            }),
            this.mappingsService.findAll(mappingPage, mappingLimit),
            this.qrCodesService.findAll(),
        ]);
        return {
            success: true,
            data: {
                songs: songsData,
                mappings: mappingsData,
                qrCodes: qrCodesData,
            },
        };
    }
    async getQrMappingPageData(mappingPage = 1, mappingLimit = 8, songLimit = 100) {
        const [mappingsData, songsData, qrCodesData] = await Promise.all([
            this.mappingsService.findAll(mappingPage, mappingLimit),
            this.songsService.findAll({
                page: 1,
                limit: songLimit,
                sortBy: 'createdAt',
                sortOrder: 'DESC',
            }),
            this.qrCodesService.findAll(),
        ]);
        return {
            success: true,
            data: {
                mappings: mappingsData,
                songs: songsData,
                qrCodes: qrCodesData,
            },
        };
    }
};
exports.BatchService = BatchService;
exports.BatchService = BatchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [songs_service_1.SongsService,
        mappings_service_1.MappingsService,
        qr_codes_service_1.QrCodesService])
], BatchService);
//# sourceMappingURL=batch.service.js.map