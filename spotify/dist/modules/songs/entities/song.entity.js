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
exports.Song = void 0;
const typeorm_1 = require("typeorm");
const mapping_entity_1 = require("../../mappings/entities/mapping.entity");
let Song = class Song {
    id;
    name;
    artist;
    releaseYear;
    spotifyTrackId;
    spotifyUrl;
    albumImageUrl;
    previewUrl;
    plays;
    createdAt;
    updatedAt;
    mappings;
};
exports.Song = Song;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Song.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Song.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Song.prototype, "artist", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', name: 'release_year' }),
    __metadata("design:type", Number)
], Song.prototype, "releaseYear", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true, name: 'spotify_track_id' }),
    __metadata("design:type", String)
], Song.prototype, "spotifyTrackId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true, name: 'spotify_url' }),
    __metadata("design:type", String)
], Song.prototype, "spotifyUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true, name: 'album_image_url' }),
    __metadata("design:type", String)
], Song.prototype, "albumImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true, name: 'preview_url' }),
    __metadata("design:type", String)
], Song.prototype, "previewUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Song.prototype, "plays", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Song.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Song.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => mapping_entity_1.Mapping, (mapping) => mapping.song),
    __metadata("design:type", Array)
], Song.prototype, "mappings", void 0);
exports.Song = Song = __decorate([
    (0, typeorm_1.Entity)('songs'),
    (0, typeorm_1.Index)(['name', 'artist']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['spotifyTrackId']),
    (0, typeorm_1.Index)(['plays', 'createdAt'])
], Song);
//# sourceMappingURL=song.entity.js.map