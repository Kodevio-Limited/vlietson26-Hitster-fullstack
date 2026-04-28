"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrCardsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const qr_cards_service_1 = require("./qr-cards.service");
const qr_cards_controller_1 = require("./qr-cards.controller");
const qr_card_entity_1 = require("./entities/qr-card.entity");
let QrCardsModule = class QrCardsModule {
};
exports.QrCardsModule = QrCardsModule;
exports.QrCardsModule = QrCardsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([qr_card_entity_1.QrCard])],
        controllers: [qr_cards_controller_1.QrCardsController],
        providers: [qr_cards_service_1.QrCardsService],
        exports: [qr_cards_service_1.QrCardsService],
    })
], QrCardsModule);
//# sourceMappingURL=qr-cards.module.js.map