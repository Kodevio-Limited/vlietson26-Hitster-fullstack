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
exports.ClerkGuard = void 0;
const common_1 = require("@nestjs/common");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../modules/auth/entities/user.entity");
let ClerkGuard = class ClerkGuard {
    configService;
    userRepository;
    clerkClient;
    constructor(configService, userRepository) {
        this.configService = configService;
        this.userRepository = userRepository;
        this.clerkClient = (0, clerk_sdk_node_1.createClerkClient)({
            secretKey: this.configService.get('clerk.secretKey')
        });
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('No token provided');
        }
        const token = authHeader.split(' ')[1];
        try {
            const sessionClaims = await this.clerkClient.verifyToken(token);
            let user = await this.userRepository.findOne({
                where: { clerkId: sessionClaims.sub }
            });
            if (!user) {
                user = this.userRepository.create({
                    clerkId: sessionClaims.sub,
                    email: sessionClaims.email || '',
                    role: 'admin',
                });
                await this.userRepository.save(user);
            }
            request.user = user;
            return true;
        }
        catch (error) {
            console.error('Clerk verification failed:', error);
            throw new common_1.UnauthorizedException('Invalid Clerk token');
        }
    }
};
exports.ClerkGuard = ClerkGuard;
exports.ClerkGuard = ClerkGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository])
], ClerkGuard);
//# sourceMappingURL=clerk.guard.js.map