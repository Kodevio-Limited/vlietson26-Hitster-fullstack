import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Health check endpoint.
 *
 * Mounted at `/api/health`. Returns 200 with `dbConnected: true` if
 * Postgres is reachable, or 503 with `dbConnected: false` if not.
 * Uptime is in seconds.
 *
 * Why this exists: a `GET /` call from a load balancer / k8s probe /
 * uptime monitor can hit `/api/health` and get a real, intentional
 * answer instead of guessing based on the `GET /` response. Health
 * endpoints should also bypass throttling and any other guards that
 * might block a probe.
 */
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @SkipThrottle()
  @Get()
  async check() {
    const uptime = Math.floor(process.uptime());
    let dbConnected = false;
    let dbError: string | undefined;

    try {
      // Cheap query that proves the pool has a working connection.
      await this.dataSource.query('SELECT 1');
      dbConnected = true;
    } catch (error) {
      dbError = error instanceof Error ? error.message : String(error);
    }

    const body = {
      status: dbConnected ? 'ok' : 'degraded',
      uptime,
      dbConnected,
      timestamp: new Date().toISOString(),
      ...(dbError ? { dbError } : {}),
    };

    if (!dbConnected) {
      // 503 lets orchestrators know to take this instance out of
      // rotation; the body still describes the failure.
      throw new ServiceUnavailableException(body);
    }

    return body;
  }
}
