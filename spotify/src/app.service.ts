import { Injectable } from '@nestjs/common';

/**
 * Public shape of `GET /` (the AppController.getApiInfo response).
 * Exported so the spec can `toEqual` against it without re-declaring
 * the field list.
 */
export interface ApiInfo {
  name: string;
  description: string;
  endpoints: {
    api: string;
    health: string;
    auth: string;
    songs: string;
    qrCodes: string;
    mappings: string;
    qrRedirect: string;
  };
}

@Injectable()
export class AppService {
  getApiInfo(): ApiInfo {
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
