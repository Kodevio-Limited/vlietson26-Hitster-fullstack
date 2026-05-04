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
exports.SongsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const songs_service_1 = require("./songs.service");
const create_song_dto_1 = require("./dto/create-song.dto");
const update_song_dto_1 = require("./dto/update-song.dto");
const search_song_dto_1 = require("./dto/search-song.dto");
const admin_guard_1 = require("../../common/guards/admin.guard");
let SongsController = class SongsController {
    songsService;
    constructor(songsService) {
        this.songsService = songsService;
    }
    async create(createSongDto, req) {
        const song = await this.songsService.create(createSongDto);
        return {
            success: true,
            message: 'Song created successfully',
            data: song,
        };
    }
    async findAll(searchDto) {
        const result = await this.songsService.findAll(searchDto);
        return {
            success: true,
            ...result,
        };
    }
    async searchSpotify(query, limit = 10) {
        const results = await this.songsService.searchSpotify(query, limit);
        return {
            success: true,
            query,
            count: results.length,
            data: results,
        };
    }
    async getPopularSongs(limit = 10) {
        const songs = await this.songsService.getPopularSongs(limit);
        return {
            success: true,
            data: songs,
        };
    }
    async getRecentSongs(limit = 5) {
        const songs = await this.songsService.getRecentSongs(limit);
        return {
            success: true,
            data: songs,
        };
    }
    async findOne(id) {
        const song = await this.songsService.findOne(id);
        return {
            success: true,
            data: song,
        };
    }
    async update(id, updateSongDto) {
        const song = await this.songsService.update(id, updateSongDto);
        return {
            success: true,
            message: 'Song updated successfully',
            data: song,
        };
    }
    async remove(id) {
        await this.songsService.remove(id);
        return {
            success: true,
            message: 'Song deleted successfully',
        };
    }
};
exports.SongsController = SongsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_song_dto_1.CreateSongDto, Object]),
    __metadata("design:returntype", Promise)
], SongsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_song_dto_1.SearchSongDto]),
    __metadata("design:returntype", Promise)
], SongsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('spotify/search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SongsController.prototype, "searchSpotify", null);
__decorate([
    (0, common_1.Get)('popular'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SongsController.prototype, "getPopularSongs", null);
__decorate([
    (0, common_1.Get)('recent'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], SongsController.prototype, "getRecentSongs", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SongsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_song_dto_1.UpdateSongDto]),
    __metadata("design:returntype", Promise)
], SongsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SongsController.prototype, "remove", null);
exports.SongsController = SongsController = __decorate([
    (0, common_1.Controller)('songs'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [songs_service_1.SongsService])
], SongsController);
//# sourceMappingURL=songs.controller.js.map