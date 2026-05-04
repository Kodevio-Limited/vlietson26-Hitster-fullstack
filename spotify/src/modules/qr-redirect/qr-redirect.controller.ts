import { Controller, Get, Param, Res, HttpStatus, Logger } from '@nestjs/common';

import * as express from 'express';
import { MappingsService } from '../mappings/mappings.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { SongsService } from '../songs/songs.service';


@Controller('qr')
export class QrRedirectController {
  private readonly logger = new Logger(QrRedirectController.name);

  constructor(
    private readonly qrCodesService: QrCodesService,
    private readonly mappingsService: MappingsService,
    private readonly songsService: SongsService,
  ) {}

  @Get('redirect/:identifier')
  async redirect(@Param('identifier') identifier: string, @Res() res: express.Response) {
    try {
      this.logger.log(`QR Code scanned: ${identifier}`);
      
      // Get QR code info
      const qrCode = await this.qrCodesService.findByIdentifier(identifier);
      
      if (!qrCode.isActive) {
        this.logger.warn(`Inactive QR code scanned: ${identifier}`);
        return res.status(HttpStatus.GONE).json({
          success: false,
          error: 'This QR code has been deactivated',
          code: 'QR_INACTIVE',
        });
      }

      // Increment scan count
      await this.qrCodesService.incrementScans(identifier);

      // Get the active mapping for this QR code
      const mapping = await this.mappingsService.getActiveMappingByQrIdentifier(identifier);
      
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
        
        this.logger.log(`QR ${identifier} mapped to song: ${mapping.song.name} by ${mapping.song.artist}`);
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
      const err = error as any;
      const status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
      if (status === 404) {
        this.logger.warn(`QR code not found: ${identifier}`);
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: 'QR code not found',
          code: 'QR_NOT_FOUND',
        });
      }
      
      this.logger.error(`Error processing QR code ${identifier}:`, err.message);
      return res.status(status).json({
        success: false,
        error: err.message || 'Internal server error',
        code: 'SERVER_ERROR',
      });
    }
  }

  @Get('info/:identifier')
  async getQrInfo(@Param('identifier') identifier: string) {
    const qrCode = await this.qrCodesService.findByIdentifier(identifier);
    const mapping = await this.mappingsService.getActiveMappingByQrIdentifier(identifier);
    
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
