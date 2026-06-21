import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let clientMessage: string;
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      clientMessage =
        typeof resp === 'string'
          ? resp
          : (resp as any).message || exception.message;
      // Normalize arrays of class-validator messages into a single string.
      if (Array.isArray(clientMessage)) {
        clientMessage = clientMessage.join('; ');
      }
    } else {
      // Never leak internal error details to clients. Log them instead.
      clientMessage = 'Internal server error';
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: clientMessage,
    };

    // Severity policy:
    //   - 5xx → error with stack trace (real operational issue)
    //   - 4xx → warn, no stack (expected client problem; not actionable
    //     for ops). 401 stays at warn (security monitors will still see it).
    //   - Anything else → error (treat unknown as worst case).
    const is5xx = status >= 500;
    const logLine = `${request.method} ${request.url} - Status: ${status} - ${JSON.stringify(errorResponse)}`;

    if (is5xx) {
      this.logger.error(
        logLine,
        exception instanceof Error ? exception.stack : '',
      );
    } else if (status >= 400) {
      this.logger.warn(logLine);
    } else {
      this.logger.error(
        logLine,
        exception instanceof Error ? exception.stack : '',
      );
    }

    response.status(status).json(errorResponse);
  }
}
