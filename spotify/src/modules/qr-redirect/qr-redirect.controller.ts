import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';

import * as express from 'express';
import { MappingsService } from '../mappings/mappings.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { SongsService } from '../songs/songs.service';

const IDENTIFIER_RE = /^[a-zA-Z0-9_-]{1,50}$/;

/**
 * The slim song projection we hand to the mobile client. Mirrors
 * `getActiveMappingByQrCodeId`'s `select.song` exactly so the
 * response shape is the source of truth.
 */
interface SongInfo {
  id: string;
  name: string;
  artist: string;
  releaseYear: number;
  spotifyTrackId: string;
  albumImageUrl: string | null;
  previewUrl: string | null;
}

@Controller('qr')
export class QrRedirectController {
  private readonly logger = new Logger(QrRedirectController.name);

  constructor(
    private readonly qrCodesService: QrCodesService,
    private readonly mappingsService: MappingsService,
    private readonly songsService: SongsService,
  ) {}

  @Get('redirect/:identifier')
  async redirect(
    @Param('identifier') identifier: string,
    @Res() res: express.Response,
  ) {
    if (!IDENTIFIER_RE.test(identifier)) {
      // Reject malformed identifiers before any DB work. Do not log
      // the raw input (potential log injection / XSS in dashboards).
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: 'Invalid QR identifier',
        code: 'INVALID_IDENTIFIER',
      });
    }

    try {
      // Slim meta lookup; returns just the columns the redirect path
      // needs (id, identifier, code, isActive). The previous version
      // did this lookup, then called `getActiveMappingByQrIdentifier`
      // which re-fetched the same row via the heavy `findByIdentifier`
      // (eager-loading mappings + mappings.song + mappings.qrCard)
      // just to recover `qrCode.id`. That second heavy query is gone —
      // we pass `qrCode.id` straight to the slim mapping lookup below.
      const qrCode = await this.qrCodesService.findMetaByIdentifier(identifier);

      if (!qrCode) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: 'QR code not found',
          code: 'QR_NOT_FOUND',
        });
      }

      if (!qrCode.isActive) {
        return res.status(HttpStatus.GONE).json({
          success: false,
          error: 'This QR code has been deactivated',
          code: 'QR_INACTIVE',
        });
      }

      // Increment scan count atomically with the isActive check. Closes
      // the TOCTOU window where a deactivation between this method and
      // the increment would still bump the counter; if the QR was
      // deactivated in the gap, the UPDATE affects 0 rows and we report
      // 410 GONE.
      const affected =
        await this.qrCodesService.incrementScansIfActive(identifier);
      if (affected === 0) {
        return res.status(HttpStatus.GONE).json({
          success: false,
          error: 'This QR code has been deactivated',
          code: 'QR_INACTIVE',
        });
      }

      // Slim active-mapping lookup keyed on qrCode.id. Skips the heavy
      // `findByIdentifier` re-fetch and uses a slim `select` so only the
      // 7 song columns the response projects come back from disk.
      const mapping = await this.mappingsService.getActiveMappingByQrCodeId(
        qrCode.id,
      );

      let songInfo: SongInfo | null = null;
      if (mapping && mapping.song) {
        // Increment play count for the song
        await this.songsService.incrementPlays(mapping.song.id);

        songInfo = {
          id: mapping.song.id,
          name: mapping.song.name,
          artist: mapping.song.artist,
          releaseYear: mapping.song.releaseYear,
          spotifyTrackId: mapping.song.spotifyTrackId,
          albumImageUrl: mapping.song.albumImageUrl,
          previewUrl: mapping.song.previewUrl,
        };
      }

      // Return JSON response for the mobile client. The previous response
      // carried a `redirectUrl` field set to the Spotify URL — duplicate
      // of `spotifyUrl` and unrelated to the QR's stored `redirectUrl`
      // (the public scan URL the mobile client already used to reach
      // here). Removed to avoid the misleading duplicate.
      return res.json({
        success: true,
        spotifyUrl: qrCode.code,
        spotifyTrackId: songInfo?.spotifyTrackId,
        song: songInfo,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      // The 4xx-vs-5xx split for the redirect path is the same as the
      // global LoggingInterceptor: a NotFound bubbles up as 404 (the
      // client tried a stale/dead QR), everything else is server-side.
      const status =
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof error.status === 'number'
          ? (error as { status: number }).status
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      // Never leak internal error messages; log full details server-side.
      this.logger.error(`Error processing QR code: ${message}`, stack);
      // Compare against the literal numeric value (404) rather than
      // the `HttpStatus.NOT_FOUND` enum member — the eslint
      // `no-unsafe-enum-comparison` rule rejects mixing `number`
      // with an enum value, and the runtime is the same.
      const isNotFound = status === 404;
      return res.status(status).json({
        success: false,
        error: isNotFound ? 'QR code not found' : 'An error occurred',
        code: isNotFound ? 'QR_NOT_FOUND' : 'SERVER_ERROR',
      });
    }
  }

  @Get('info/:identifier')
  async getQrInfo(@Param('identifier') identifier: string) {
    if (!IDENTIFIER_RE.test(identifier)) {
      throw new BadRequestException('Invalid QR identifier');
    }
    const qrCode = await this.qrCodesService.findByIdentifier(identifier);
    const mapping =
      await this.mappingsService.getActiveMappingByQrIdentifier(identifier);

    return {
      success: true,
      data: {
        identifier: qrCode.identifier,
        isActive: qrCode.isActive,
        scans: qrCode.scans,
        createdAt: qrCode.createdAt,
        song: mapping?.song || null,
      },
    };
  }
}
