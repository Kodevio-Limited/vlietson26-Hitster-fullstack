import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Mapping } from './entities/mapping.entity';
import { CreateMappingDto } from './dto/create-mapping.dto';
import { SongsService } from '../songs/songs.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { QrCardsService } from '../qr-cards/qr-cards.service';
import { QrCard } from '../qr-cards/entities/qr-card.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class MappingsService {
  private readonly logger = new Logger(MappingsService.name);

  constructor(
    @InjectRepository(Mapping)
    private readonly mappingRepository: Repository<Mapping>,
    @Inject(forwardRef(() => SongsService))
    private readonly songsService: SongsService,
    private readonly qrCodesService: QrCodesService,
    private readonly qrCardsService: QrCardsService,
    private readonly notificationsService: NotificationsService,
    private readonly cacheService: CacheService,
  ) {}

  async create(
    createMappingDto: CreateMappingDto,
    userId: string,
  ): Promise<Mapping> {
    // Verify song exists
    const song = await this.songsService.findOne(createMappingDto.songId);

    // Verify QR code exists
    const qrCode = await this.qrCodesService.findOne(createMappingDto.qrCodeId);

    // Check if mapping already exists for this song+QR combination.
    // The (songId, qrCodeId) unique index catches the race condition; if
    // a concurrent insert wins, the DB throws and we translate below.
    const existing = await this.mappingRepository.findOne({
      where: {
        songId: createMappingDto.songId,
        qrCodeId: createMappingDto.qrCodeId,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Mapping already exists for this song and QR code',
      );
    }

    let qrCard: QrCard | null = null;
    if (createMappingDto.qrCardId) {
      qrCard = await this.qrCardsService.findOne(createMappingDto.qrCardId);
      if (qrCard.status !== 'active') {
        throw new ConflictException('QR Card is not active');
      }
    }

    try {
      const mapping = this.mappingRepository.create({
        songId: song.id,
        qrCodeId: qrCode.id,
        qrCardId: qrCard?.id,
        createdById: userId,
        isActive: true,
      });

      const savedMapping = await this.mappingRepository.save(mapping);
      this.cacheService.invalidatePattern('mappings:*');

      await this.notificationsService.create({
        type: 'mapping_created',
        category: 'content',
        title: 'QR mapping created',
        message: `QR ${qrCode.identifier} mapped to "${song.name}".`,
        metadata: {
          mappingId: savedMapping.id,
          songId: song.id,
          qrCodeId: qrCode.id,
        },
      });
      this.logger.log(
        `Mapping created: Song "${song.name}" -> QR Code "${qrCode.identifier}"`,
      );

      return savedMapping;
    } catch (err) {
      // Concurrent insert hit the unique index. Translate to a friendly error.
      // `QueryFailedError.driverError.code` is the Postgres SQLSTATE
      // string; `23505` is `unique_violation`. TypeORM's typing for
      // `driverError` is `Record<string, unknown> | { code?: string }`,
      // and the `in`-narrow doesn't satisfy eslint's
      // unsafe-member-access rule on its own — assert the shape we
      // expect at the access point.
      if (err instanceof QueryFailedError) {
        const driverError = err.driverError as { code?: unknown };
        if (driverError.code === '23505') {
          throw new ConflictException(
            'Mapping already exists for this song and QR code',
          );
        }
      }
      throw err;
    }
  }

  async update(
    id: string,
    updateMappingDto: Partial<CreateMappingDto>,
  ): Promise<Mapping> {
    const mapping = await this.findOne(id);

    if (updateMappingDto.songId) {
      const song = await this.songsService.findOne(updateMappingDto.songId);
      mapping.songId = song.id;
    }

    if (updateMappingDto.qrCodeId) {
      const qrCode = await this.qrCodesService.findOne(
        updateMappingDto.qrCodeId,
      );
      mapping.qrCodeId = qrCode.id;
    }

    if (updateMappingDto.qrCardId) {
      const qrCard = await this.qrCardsService.findOne(
        updateMappingDto.qrCardId,
      );
      mapping.qrCardId = qrCard.id;
    }

    const updated = await this.mappingRepository.save(mapping);
    this.cacheService.invalidatePattern('mappings:*');
    this.logger.log(`Mapping updated: ${id}`);

    return this.findOne(updated.id);
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ items: Mapping[]; total: number }> {
    const safeLimit = Math.min(limit, 100);

    // Cache COUNT and the page separately. The previous code used
    // TypeORM's `findAndCount`, which runs a fresh `SELECT COUNT(*)`
    // on every request — a sequential scan that scales with row count.
    // With pagination across pages 1..N, the COUNT result is identical
    // for every page; caching it once at 5min TTL means only the
    // SELECT runs per page change, not the COUNT.
    //
    // Invalidation: `create/update/deactivate/remove` call
    // `cacheService.invalidatePattern('mappings:*')`, which clears
    // both the count and list buckets in one call.
    //
    // Caveat: cache is per-pod. Multi-pod deployments need a shared
    // cache (deferred — see CLAUDE.md).
    const total = await this.getCachedMappingCount();
    const items = await this.getCachedMappingPage(page, safeLimit);
    return { items, total };
  }

  /**
   * 5-min cached COUNT of all mappings. The dashboard and qr-mapping
   * page both call `findAll()` on every load; with `findAndCount` each
   * call issued a `SELECT COUNT(*)` on a non-indexed `mappings` table
   * — the dominant chunk of the request latency against the remote
   * Neon database.
   */
  private async getCachedMappingCount(): Promise<number> {
    return this.cacheService.getOrSet(
      'mappings:count:all',
      () => this.mappingRepository.count(),
      300,
    );
  }

  /**
   * 30-second cached page. Shorter than the COUNT cache because
   * mappers expect newly-created/removed mappings to appear quickly.
   * Slim `select`: only the columns the dashboard's `MappingDto` shape
   * (lib/api/admin-dashboard.ts) actually reads. Drops `createdById`
   * (the original code already dropped the `createdBy` relation to
   * avoid loading password hashes) and `qrCardId`. The relations load
   * the slim song and slim qrCode — the qrCode is intentionally
   * without `imageUrl` because the column is `select: false` and the
   * dashboard mapping list doesn't display it.
   */
  private async getCachedMappingPage(
    page: number,
    limit: number,
  ): Promise<Mapping[]> {
    const cacheKey = `mappings:list:${JSON.stringify({ page, limit })}`;
    return this.cacheService.getOrSet(
      cacheKey,
      () =>
        this.mappingRepository.find({
          relations: ['song', 'qrCode'],
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            songId: true,
            qrCodeId: true,
            qrCardId: true,
            isActive: true,
            createdAt: true,
            song: {
              id: true,
              name: true,
              artist: true,
            },
            qrCode: {
              id: true,
              identifier: true,
              isActive: true,
              redirectUrl: true,
            },
          },
        }),
      30,
    );
  }

  async findOne(id: string): Promise<Mapping> {
    const mapping = await this.mappingRepository.findOne({
      where: { id },
      relations: ['song', 'qrCode', 'qrCard'],
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping with ID ${id} not found`);
    }

    return mapping;
  }

  async findByQrCard(cardId: string): Promise<Mapping[]> {
    return await this.mappingRepository.find({
      where: { qrCardId: cardId, isActive: true },
      relations: ['song', 'qrCode'],
    });
  }

  async findBySong(songId: string): Promise<Mapping[]> {
    return await this.mappingRepository.find({
      where: { songId, isActive: true },
      relations: ['qrCode', 'qrCard'],
    });
  }

  async deactivate(id: string): Promise<Mapping> {
    const mapping = await this.findOne(id);
    mapping.isActive = false;
    const updated = await this.mappingRepository.save(mapping);
    this.cacheService.invalidatePattern('mappings:*');
    this.logger.log(`Mapping deactivated: ${id}`);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const mapping = await this.findOne(id);
    const mappingSongName = mapping.song?.name ?? mapping.songId;
    const mappingQrIdentifier = mapping.qrCode?.identifier ?? mapping.qrCodeId;
    await this.mappingRepository.remove(mapping);
    this.cacheService.invalidatePattern('mappings:*');
    await this.notificationsService.create({
      type: 'mapping_deleted',
      category: 'content',
      severity: 'warning',
      title: 'QR mapping deleted',
      message: `Mapping removed: QR ${mappingQrIdentifier} from "${mappingSongName}".`,
      metadata: {
        mappingId: id,
        songId: mapping.songId,
        qrCodeId: mapping.qrCodeId,
      },
    });
    this.logger.log(`Mapping deleted: ${id}`);
  }

  async getActiveMappingByQrIdentifier(
    identifier: string,
  ): Promise<Mapping | null> {
    const qrCode = await this.qrCodesService.findByIdentifier(identifier);

    const mapping = await this.mappingRepository.findOne({
      where: {
        qrCodeId: qrCode.id,
        isActive: true,
      },
      relations: ['song', 'qrCode'],
      // Deterministic ordering as a safety net; the (qrCodeId) WHERE
      // is_active=true index should still return at most one row once
      // the partial unique index migration is applied.
      order: { createdAt: 'DESC' },
    });

    return mapping;
  }

  /**
   * Hot-path version of `getActiveMappingByQrIdentifier`. Takes the QR
   * id (already returned by `findMetaByIdentifier` on the scan path) and
   * skips the heavy `findByIdentifier` call that eagerly loads
   * `mappings` + `mappings.song` + `mappings.qrCard`. Uses a slim
   * `select` so only the columns the redirect endpoint actually reads
   * come back from the DB.
   *
   * Two queries on the original hot path (findMeta + this lookup)
   * become two; the redundant third query (findByIdentifier re-fetching
   * the same QR row to recover its id) is gone.
   */
  async getActiveMappingByQrCodeId(qrCodeId: string): Promise<Mapping | null> {
    return this.mappingRepository.findOne({
      where: { qrCodeId, isActive: true },
      relations: ['song'],
      // Slim SELECT: only what `qr-redirect.controller.ts` projects into
      // `songInfo`. Avoids loading `previewUrl`/`spotifyUrl`/etc. on the
      // mapping row and the full song row.
      select: {
        id: true,
        isActive: true,
        songId: true,
        qrCodeId: true,
        song: {
          id: true,
          name: true,
          artist: true,
          releaseYear: true,
          spotifyTrackId: true,
          albumImageUrl: true,
          previewUrl: true,
        },
      },
      // Deterministic ordering as a safety net; the (qrCodeId) WHERE
      // is_active=true index should still return at most one row once
      // the partial unique index migration is applied.
      order: { createdAt: 'DESC' },
    });
  }
}
