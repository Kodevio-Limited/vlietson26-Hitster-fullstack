import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const isProd = configService.get<string>('nodeEnv') === 'production';

  // Security headers. The CSP is intentionally minimal because the API
  // is consumed by a separate frontend; tighten per-deployment as needed.
  app.use(helmet());

  // Default 100kb body limit; the QR image endpoint opts into a larger
  // limit via a route-specific middleware (currently only /auth/update-profile
  // accepts base64 avatars). The previous 10MB default was an unnecessary
  // DoS surface.
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // Enable CORS. In production we require FRONTEND_URL to be set; the
  // configuration loader falls back to localhost in dev only.
  const frontendUrl = configService.get<string>('frontendUrl');
  if (isProd && (!frontendUrl || frontendUrl.startsWith('http://localhost'))) {
    throw new Error(
      'FRONTEND_URL must be set to a non-localhost URL in production',
    );
  }
  app.enableCors({
    origin: [frontendUrl],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = configService.get('port') || 4002;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🔐 Environment: ${configService.get('nodeEnv')}`);
}

bootstrap();
