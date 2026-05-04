export declare class CacheService {
    private readonly logger;
    private cache;
    get<T>(key: string): T | undefined;
    set<T>(key: string, value: T, ttlSeconds?: number): void;
    delete(key: string): void;
    clear(): void;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T>;
    invalidatePattern(pattern: string): void;
    getStats(): {
        size: number;
        keys: string[];
    };
}
