import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      name: 'OV Bouwradio API',
      description:
        'QR-code-driven music game backend (Hitster-style). The frontend lives on a separate origin; this service only serves /api/* routes.',
      endpoints: {
        api: '/api',
        health: '/api/health',
        auth: '/api/auth',
        songs: '/api/songs',
        qrCodes: '/api/qr-codes',
        mappings: '/api/mappings',
        qrRedirect: '/api/qr/redirect/:identifier',
      },
    };
  }
}
