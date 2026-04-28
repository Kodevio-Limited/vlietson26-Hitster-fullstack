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
var SpotifyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
let SpotifyService = SpotifyService_1 = class SpotifyService {
    httpService;
    configService;
    accessToken;
    tokenExpiry;
    logger = new common_1.Logger(SpotifyService_1.name);
    constructor(httpService, configService) {
        this.httpService = httpService;
        this.configService = configService;
    }
    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        const auth = Buffer.from(`${this.configService.get('spotify.clientId')}:${this.configService.get('spotify.clientSecret')}`).toString('base64');
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }));
            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
            this.logger.log('Spotify access token obtained successfully');
            return this.accessToken;
        }
        catch (error) {
            const err = error;
            this.logger.error('Failed to get Spotify access token', err.message);
            throw new common_1.HttpException('Failed to authenticate with Spotify API', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async searchTracks(query, limit = 10) {
        const token = await this.getAccessToken();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get('https://api.spotify.com/v1/search', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: {
                    q: query,
                    type: 'track',
                    limit: Math.min(limit, 50),
                },
            }));
            return response.data.tracks.items.map(track => ({
                id: track.id,
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                artists: track.artists.map(a => ({ id: a.id, name: a.name })),
                album: track.album.name,
                albumId: track.album.id,
                albumImage: track.album.images[0]?.url,
                albumImages: track.album.images,
                previewUrl: track.preview_url,
                spotifyUrl: track.external_urls.spotify,
                duration: track.duration_ms,
                durationFormatted: this.formatDuration(track.duration_ms),
                popularity: track.popularity,
                explicit: track.explicit,
            }));
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to search tracks: ${query}`, err.message);
            throw new common_1.HttpException('Failed to search tracks on Spotify', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getTrackById(trackId) {
        const token = await this.getAccessToken();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            }));
            const track = response.data;
            return {
                id: track.id,
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                artists: track.artists.map(a => ({ id: a.id, name: a.name })),
                album: track.album.name,
                albumId: track.album.id,
                albumImage: track.album.images[0]?.url,
                previewUrl: track.preview_url,
                spotifyUrl: track.external_urls.spotify,
                duration: track.duration_ms,
                durationFormatted: this.formatDuration(track.duration_ms),
                popularity: track.popularity,
                explicit: track.explicit,
            };
        }
        catch (error) {
            const err = error;
            if (err.response?.status === 404) {
                throw new common_1.HttpException('Track not found on Spotify', common_1.HttpStatus.NOT_FOUND);
            }
            this.logger.error(`Failed to get track: ${trackId}`, err.message);
            throw new common_1.HttpException('Failed to get track details from Spotify', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getSeveralTracks(trackIds) {
        const token = await this.getAccessToken();
        const ids = trackIds.join(',');
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`https://api.spotify.com/v1/tracks`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: { ids },
            }));
            return response.data.tracks.map(track => ({
                id: track.id,
                name: track.name,
                artist: track.artists.map(a => a.name).join(', '),
                albumImage: track.album.images[0]?.url,
                spotifyUrl: track.external_urls.spotify,
                previewUrl: track.preview_url,
            }));
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to get several tracks`, err.message);
            throw new common_1.HttpException('Failed to get tracks from Spotify', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getAlbumTracks(albumId) {
        const token = await this.getAccessToken();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                params: { limit: 50 },
            }));
            return response.data.items.map(track => ({
                id: track.id,
                name: track.name,
                duration: track.duration_ms,
                trackNumber: track.track_number,
            }));
        }
        catch (error) {
            const err = error;
            this.logger.error(`Failed to get album tracks: ${albumId}`, err.message);
            throw new common_1.HttpException('Failed to get album tracks from Spotify', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    formatDuration(ms) {
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}:${parseInt(seconds) < 10 ? '0' : ''}${seconds}`;
    }
};
exports.SpotifyService = SpotifyService;
exports.SpotifyService = SpotifyService = SpotifyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], SpotifyService);
//# sourceMappingURL=spotify.service.js.map