import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * Standalone health module. No providers — the controller pulls
 * `DataSource` from the global TypeORM registration in `app.module.ts`.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
