import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Shape of the user payload we attach to `req.user` from
 * `JwtStrategy.validate()`. We only ever read `.id` for the log
 * line, but typing the field keeps the rest of the interceptor
 * free of `any`.
 */
interface AuthenticatedUser {
  id: string;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { method, url, ip, user } = request;
    const userAgent = request.get('user-agent') ?? '';
    const startTime = Date.now();

    // Redact PII: log only the user id, not the email, to avoid leaving
    // user identifiers in stdout. Adjust the projection as needed for
    // debugging in dev (e.g. log email when NODE_ENV !== 'production').
    const userRef = user?.id ? `[User:${user.id}]` : '';

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${url} ${statusCode} - ${duration}ms - ${userAgent} ${ip} ${userRef}`,
          );
        },
        error: (error: unknown) => {
          // Errors thrown inside the request stream aren't typed by
          // Nest (the global filter wraps whatever reaches it), so
          // we narrow manually. `status` defaults to 500 so a
          // thrown `new Error('boom')` still falls into the 5xx
          // branch.
          const duration = Date.now() - startTime;
          const status =
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof error.status === 'number'
              ? (error as { status: number }).status
              : 500;
          const message =
            error instanceof Error ? error.message : String(error);
          const stack = error instanceof Error ? error.stack : undefined;
          // 4xx (e.g. 404 for an unknown route) is a normal client
          // outcome, not an operational error. Only 5xx gets the
          // stack trace and error level.
          const line = `${method} ${url} ${status} - ${duration}ms - ${userAgent} ${ip} ${userRef} - Error: ${message}`;
          if (status >= 500) {
            this.logger.error(line, stack);
          } else if (status >= 400) {
            this.logger.warn(line);
          } else {
            this.logger.error(line, stack);
          }
        },
      }),
    );
  }
}
