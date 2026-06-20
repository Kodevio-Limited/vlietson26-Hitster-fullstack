import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, user } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Redact PII: log only the user id, not the email, to avoid leaving
    // user identifiers in stdout. Adjust the projection as needed for
    // debugging in dev (e.g. log email when NODE_ENV !== 'production').
    const userRef = user ? `[User:${user.id}]` : '';

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${url} ${statusCode} - ${duration}ms - ${userAgent} ${ip} ${userRef}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `${method} ${url} ${error.status} - ${duration}ms - ${userAgent} ${ip} ${userRef} - Error: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
