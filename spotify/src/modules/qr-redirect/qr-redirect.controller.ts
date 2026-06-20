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
      this.logger.log(`QR Code scanned`);

      // Use the slim meta lookup; the heavy findByIdentifier joins
      // mappings/song/qrCard which we do not need here.
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

      // Increment scan count only after we know the QR is valid and active.
      // The atomic increment returns the new value but we don't surface it.
      await this.qrCodesService.incrementScans(identifier);

      // Get the active mapping for this QR code (now that we know the QR
      // is active, this lookup is the only second DB hit per scan).
      const mapping =
        await this.mappingsService.getActiveMappingByQrIdentifier(identifier);

      let songInfo: any = null;
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

        this.logger.log(
          `QR ${identifier} mapped to song: ${mapping.song.name} by ${mapping.song.artist}`,
        );
      }

      // Return JSON response for mobile app
      // The mobile app will use this to open Spotify
      return res.json({
        success: true,
        spotifyUrl: qrCode.code,
        spotifyTrackId: songInfo?.spotifyTrackId,
        song: songInfo,
        redirectUrl: qrCode.code,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const err = error;
      const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
      // Never leak internal error messages; log full details server-side.
      this.logger.error(`Error processing QR code: ${err.message}`, err.stack);
      return res.status(status).json({
        success: false,
        error:
          status === HttpStatus.NOT_FOUND
            ? 'QR code not found'
            : 'An error occurred',
        code: status === HttpStatus.NOT_FOUND ? 'QR_NOT_FOUND' : 'SERVER_ERROR',
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
