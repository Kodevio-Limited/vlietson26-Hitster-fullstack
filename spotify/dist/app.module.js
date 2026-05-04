"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const configuration_1 = __importDefault(require("./config/configuration"));
const songs_module_1 = require("./modules/songs/songs.module");
const qr_codes_module_1 = require("./modules/qr-codes/qr-codes.module");
const qr_cards_module_1 = require("./modules/qr-cards/qr-cards.module");
const mappings_module_1 = require("./modules/mappings/mappings.module");
const spotify_module_1 = require("./modules/spotify/spotify.module");
const auth_module_1 = require("./modules/auth/auth.module");
const mail_module_1 = require("./modules/mail/mail.module");
const batch_module_1 = require("./modules/batch/batch.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const qr_redirect_controller_1 = require("./modules/qr-redirect/qr-redirect.controller");
const song_entity_1 = require("./modules/songs/entities/song.entity");
const qr_code_entity_1 = require("./modules/qr-codes/entities/qr-code.entity");
const qr_card_entity_1 = require("./modules/qr-cards/entities/qr-card.entity");
const mapping_entity_1 = require("./modules/mappings/entities/mapping.entity");
const user_entity_1 = require("./modules/auth/entities/user.entity");
const notification_entity_1 = require("./modules/notifications/entities/notification.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('database.host'),
                    port: configService.get('database.port'),
                    username: configService.get('database.username'),
                    password: configService.get('database.password'),
                    database: configService.get('database.database'),
                    entities: [song_entity_1.Song, qr_code_entity_1.QrCode, qr_card_entity_1.QrCard, mapping_entity_1.Mapping, user_entity_1.User, notification_entity_1.Notification],
                    synchronize: configService.get('nodeEnv') !== 'production',
                    logging: configService.get('nodeEnv') === 'development',
                    ssl: {
                        rejectUnauthorized: false,
                    },
                    extra: {
                        max: 20,
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 10000,
                    },
                    retryAttempts: 5,
                    retryDelay: 5000,
                }),
                inject: [config_1.ConfigService],
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    throttlers: [
                        {
                            ttl: configService.get('throttle.ttl'),
                            limit: configService.get('throttle.limit'),
                        },
                    ],
                }),
                inject: [config_1.ConfigService],
            }),
            songs_module_1.SongsModule,
            qr_codes_module_1.QrCodesModule,
            qr_cards_module_1.QrCardsModule,
            mappings_module_1.MappingsModule,
            spotify_module_1.SpotifyModule,
            auth_module_1.AuthModule,
            mail_module_1.MailModule,
            batch_module_1.BatchModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [qr_redirect_controller_1.QrRedirectController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map