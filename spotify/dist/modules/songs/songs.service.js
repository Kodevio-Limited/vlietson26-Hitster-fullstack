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
var SongsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SongsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const song_entity_1 = require("./entities/song.entity");
const spotify_service_1 = require("../spotify/spotify.service");
const cache_service_1 = require("../../common/services/cache.service");
const notifications_service_1 = require("../notifications/notifications.service");
let SongsService = SongsService_1 = class SongsService {
    songRepository;
    spotifyService;
    cacheService;
    notificationsService;
    logger = new common_1.Logger(SongsService_1.name);
    constructor(songRepository, spotifyService, cacheService, notificationsService) {
        this.songRepository = songRepository;
        this.spotifyService = spotifyService;
        this.cacheService = cacheService;
        this.notificationsService = notificationsService;
    }
    async create(createSongDto) {
        const existingSong = await this.songRepository.findOne({
            where: { spotifyTrackId: createSongDto.spotifyTrackId },
        });
        if (existingSong) {
            throw new common_1.ConflictException('Song with this Spotify Track ID already exists');
        }
        let spotifyInfo = null;
        try {
            spotifyInfo = await this.spotifyService.getTrackById(createSongDto.spotifyTrackId);
            this.logger.log(`Fetched Spotify info for track: ${createSongDto.spotifyTrackId}`);
        }
        catch (error) {
            this.logger.warn(`Could not fetch Spotify info: ${error.message}`);
        }
        const song = this.songRepository.create({
            ...createSongDto,
            spotifyUrl: spotifyInfo?.spotifyUrl,
            albumImageUrl: spotifyInfo?.albumImage,
            previewUrl: spotifyInfo?.previewUrl,
        });
        const savedSong = await this.songRepository.save(song);
        this.cacheService.invalidatePattern('songs:*');
        await this.notificationsService.create({
            type: 'song_created',
            category: 'content',
            title: 'Song added',
            message: `"${savedSong.name}" by ${savedSong.artist} was added.`,
            metadata: { songId: savedSong.id },
        });
        this.logger.log(`Song created: ${savedSong.name} by ${savedSong.artist}`);
        return savedSong;
    }
    async findAll(searchDto) {
        const { q, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto;
        const where = {};
        if (q) {
            where.name = (0, typeorm_2.Like)(`%${q}%`);
        }
        const [items, total] = await this.songRepository.findAndCount({
            where,
            order: { [sortBy]: sortOrder },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async findOne(id) {
        const song = await this.songRepository.findOne({
            where: { id },
            relations: ['mappings', 'mappings.qrCode', 'mappings.qrCard'],
        });
        if (!song) {
            throw new common_1.NotFoundException(`Song with ID ${id} not found`);
        }
        return song;
    }
    async update(id, updateSongDto) {
        const song = await this.findOne(id);
        if (updateSongDto.spotifyTrackId && updateSongDto.spotifyTrackId !== song.spotifyTrackId) {
            try {
                const spotifyInfo = await this.spotifyService.getTrackById(updateSongDto.spotifyTrackId);
                song.spotifyUrl = spotifyInfo?.spotifyUrl;
                song.albumImageUrl = spotifyInfo?.albumImage;
                song.previewUrl = spotifyInfo?.previewUrl;
                this.logger.log(`Updated Spotify info for song: ${song.name}`);
            }
            catch (error) {
                this.logger.warn(`Could not fetch Spotify info: ${error.message}`);
            }
        }
        Object.assign(song, updateSongDto);
        const updatedSong = await this.songRepository.save(song);
        this.cacheService.invalidatePattern('songs:*');
        this.logger.log(`Song updated: ${updatedSong.name}`);
        return updatedSong;
    }
    async remove(id) {
        const song = await this.findOne(id);
        await this.songRepository.remove(song);
        this.cacheService.invalidatePattern('songs:*');
        await this.notificationsService.create({
            type: 'song_deleted',
            category: 'content',
            severity: 'warning',
            title: 'Song deleted',
            message: `"${song.name}" by ${song.artist} was deleted.`,
            metadata: { songId: song.id },
        });
        this.logger.log(`Song deleted: ${song.name}`);
    }
    async incrementPlays(id) {
        await this.songRepository.increment({ id }, 'plays', 1);
        this.logger.debug(`Incremented plays for song ID: ${id}`);
    }
    async searchSpotify(query, limit = 10) {
        this.logger.log(`Searching Spotify for: ${query}`);
        return await this.spotifyService.searchTracks(query, limit);
    }
    async getPopularSongs(limit = 10) {
        const cacheKey = `songs:popular:${limit}`;
        return await this.cacheService.getOrSet(cacheKey, () => this.songRepository.find({
            order: { plays: 'DESC' },
            take: limit,
            select: ['id', 'name', 'artist', 'spotifyTrackId', 'albumImageUrl', 'plays', 'createdAt'],
        }), 300);
    }
    async getRecentSongs(limit = 5) {
        const cacheKey = `songs:recent:${limit}`;
        return await this.cacheService.getOrSet(cacheKey, () => this.songRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            select: ['id', 'name', 'artist', 'releaseYear', 'spotifyTrackId', 'albumImageUrl', 'createdAt'],
        }), 300);
    }
};
exports.SongsService = SongsService;
exports.SongsService = SongsService = SongsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(song_entity_1.Song)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        spotify_service_1.SpotifyService,
        cache_service_1.CacheService,
        notifications_service_1.NotificationsService])
], SongsService);
//# sourceMappingURL=songs.service.js.map