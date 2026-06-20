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

    // Log the full server-side error including stack for ops, but never
    // include it in the response body.
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - ${JSON.stringify(errorResponse)}`,
      exception instanceof Error ? exception.stack : '',
    );

    response.status(status).json(errorResponse);
  }
}
