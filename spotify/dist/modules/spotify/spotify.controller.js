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
exports.SpotifyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const spotify_service_1 = require("./spotify.service");
let SpotifyController = class SpotifyController {
    spotifyService;
    constructor(spotifyService) {
        this.spotifyService = spotifyService;
    }
    async searchTracks(query, limit = 10) {
        const results = await this.spotifyService.searchTracks(query, limit);
        return {
            success: true,
            query,
            count: results.length,
            data: results,
        };
    }
    async getTrack(id) {
        const track = await this.spotifyService.getTrackById(id);
        return {
            success: true,
            data: track,
        };
    }
    async getSeveralTracks(ids) {
        const trackIds = ids.split(',');
        const tracks = await this.spotifyService.getSeveralTracks(trackIds);
        return {
            success: true,
            count: tracks.length,
            data: tracks,
        };
    }
};
exports.SpotifyController = SpotifyController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SpotifyController.prototype, "searchTracks", null);
__decorate([
    (0, common_1.Get)('track'),
    __param(0, (0, common_1.Query)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpotifyController.prototype, "getTrack", null);
__decorate([
    (0, common_1.Get)('tracks'),
    __param(0, (0, common_1.Query)('ids')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SpotifyController.prototype, "getSeveralTracks", null);
exports.SpotifyController = SpotifyController = __decorate([
    (0, common_1.Controller)('spotify'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [spotify_service_1.SpotifyService])
], SpotifyController);
//# sourceMappingURL=spotify.controller.js.map