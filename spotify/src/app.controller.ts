import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * API info / root handler. Mounted at `/` (excluded from the `/api`
   * global prefix in `main.ts`) so a hit on the backend root returns
   * useful metadata instead of 404. The frontend never calls this —
   * it's here for humans / health checks that hit the backend root
   * directly. `@SkipThrottle()` is applied because the global
   * ThrottlerGuard would otherwise count every health-check probe.
   */
  @SkipThrottle()
  @Get()
  getApiInfo() {
    return this.appService.getApiInfo();
  }
}
