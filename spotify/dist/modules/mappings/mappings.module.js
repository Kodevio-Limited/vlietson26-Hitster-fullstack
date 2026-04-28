"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MappingsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const mappings_service_1 = require("./mappings.service");
const mappings_controller_1 = require("./mappings.controller");
const mapping_entity_1 = require("./entities/mapping.entity");
const songs_module_1 = require("../songs/songs.module");
const qr_codes_module_1 = require("../qr-codes/qr-codes.module");
const qr_cards_module_1 = require("../qr-cards/qr-cards.module");
const notifications_module_1 = require("../notifications/notifications.module");
let MappingsModule = class MappingsModule {
};
exports.MappingsModule = MappingsModule;
exports.MappingsModule = MappingsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([mapping_entity_1.Mapping]),
            songs_module_1.SongsModule,
            qr_codes_module_1.QrCodesModule,
            qr_cards_module_1.QrCardsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [mappings_controller_1.MappingsController],
        providers: [mappings_service_1.MappingsService],
        exports: [mappings_service_1.MappingsService],
    })
], MappingsModule);
//# sourceMappingURL=mappings.module.js.map