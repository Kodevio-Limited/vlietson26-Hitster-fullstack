"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
let CacheService = CacheService_1 = class CacheService {
    logger = new common_1.Logger(CacheService_1.name);
    cache = new Map();
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.logger.debug(`Cache expired for key: ${key}`);
            return undefined;
        }
        this.logger.debug(`Cache hit for key: ${key}`);
        return entry.data;
    }
    set(key, value, ttlSeconds = 300) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { data: value, expiresAt });
        this.logger.debug(`Cache set for key: ${key}, expires in ${ttlSeconds}s`);
    }
    delete(key) {
        this.cache.delete(key);
        this.logger.debug(`Cache deleted for key: ${key}`);
    }
    clear() {
        this.cache.clear();
        this.logger.debug('Cache cleared');
    }
    async getOrSet(key, factory, ttlSeconds = 300) {
        const cached = this.get(key);
        if (cached) {
            return cached;
        }
        const value = await factory();
        this.set(key, value, ttlSeconds);
        return value;
    }
    invalidatePattern(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        let count = 0;
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        this.logger.debug(`Invalidated ${count} cache entries matching pattern: ${pattern}`);
    }
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
};
exports.CacheService = CacheService;
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)()
], CacheService);
//# sourceMappingURL=cache.service.js.map