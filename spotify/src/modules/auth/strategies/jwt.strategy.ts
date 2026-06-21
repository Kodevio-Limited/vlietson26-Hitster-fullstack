import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { JWT_ALGORITHMS, JWT_AUDIENCE, JWT_ISSUER } from '../constants';

/**
 * Cache entry shape. `user` is the safe projection that nestjs/passport
 * attaches to `req.user`; we never store the raw entity (no password,
 * no Spotify tokens) so a stale entry can't widen the blast radius if
 * someone dumps the Map.
 */
interface CachedUser {
  user: {
    id: string;
    email: string;
    role: string;
    spotifyId: string | null;
    displayName: string;
  };
  expiresAt: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * In-memory cache of `validate()` results keyed by `${sub}:${tokenVersion}`.
   *
   * Why a cache at all? Every authenticated request currently pays
   * one round-trip to the database just to confirm the user still
   * exists and is active. Against a remote Postgres (Neon) that's
   * 50-200ms per request — the dominant chunk of admin-page load
   * latency on the songs/dashboard pages.
   *
   * Why include `tokenVersion` in the key? `AuthService.bumpTokenVersion`
   * is called from `resetPassword`/`changePassword`. When the user's
   * tokenVersion goes from N to N+1, the next request looks up a
   * different cache key, misses, and refetches — the previously-cached
   * entry becomes unreachable. No explicit eviction needed.
   *
   * Staleness window: 60s. A user deactivated via `isActive=false` is
   * still served from cache for up to 60s after their last request.
   * Acceptable for admin dashboard traffic; tighten the TTL or move
   * to a shared cache (Redis) if that becomes a problem. Multi-pod
   * note: each pod has its own Map, so the staleness window is per
   * pod — same bound, just multiplied by pod count.
   */
  private readonly userCache = new Map<string, CachedUser>();
  private static readonly CACHE_TTL_MS = 60_000;
  private static readonly CACHE_MAX_ENTRIES = 5_000;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
      // Pin the allowed algorithms — defense-in-depth against algorithm
      // confusion if a future refactor introduces an asymmetric public
      // key without remembering to update passport-jwt.
      algorithms: JWT_ALGORITHMS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  }

  async validate(payload: any) {
    const claimVersion =
      typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0;
    const cacheKey = `${payload.sub}:${claimVersion}`;
    const now = Date.now();

    // Cache hit: tokenVersion was already verified when this entry
    // was placed, so a hit is safe to return without a DB round-trip.
    const cached = this.userCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.user;
    }

    // Cache miss or expired — fetch, verify, cache, return.
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Enforce `tokenVersion` revocation. Tokens minted after the
    // column landed carry the user's current `tokenVersion` as a
    // claim; legacy tokens (no claim) compare equal because we
    // default both sides to 0. The first `resetPassword` or
    // `changePassword` bumps the user from 0 to 1 and every legacy
    // token dies on its next request. After every active user has
    // re-logged in once the legacy branch is dead and can be
    // tightened to require the claim outright.
    if (claimVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      spotifyId: user.spotifyId,
      displayName: user.displayName,
    };

    // Bound the cache. FIFO eviction is fine for admin-volume traffic;
    // the cap is a memory safety net, not a hot-path concern. We don't
    // try to evict expired entries eagerly — TTL is checked on read.
    if (this.userCache.size >= JwtStrategy.CACHE_MAX_ENTRIES) {
      const firstKey = this.userCache.keys().next().value;
      if (firstKey !== undefined) {
        this.userCache.delete(firstKey);
      }
    }
    this.userCache.set(cacheKey, {
      user: safeUser,
      expiresAt: now + JwtStrategy.CACHE_TTL_MS,
    });

    return safeUser;
  }
}
