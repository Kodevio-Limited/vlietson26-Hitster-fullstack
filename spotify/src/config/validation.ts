import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  validateSync,
  MinLength,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  NODE_ENV: string;

  @IsNumber()
  PORT: number;

  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  FRONTEND_URL?: string;

  @IsString()
  SPOTIFY_CLIENT_ID: string;

  @IsString()
  SPOTIFY_CLIENT_SECRET: string;

  @IsString()
  @IsUrl({ require_tld: false })
  SPOTIFY_REDIRECT_URI: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters' })
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  API_URL?: string;
}

export function validate(config: Record<string, unknown>) {
  // JWT_SECRET is required only in production; in dev we tolerate a default
  // so first-time local setup doesn't fail.
  const isProd = config.NODE_ENV === 'production';

  if (isProd && !config.JWT_SECRET) {
    throw new Error('JWT_SECRET is required in production');
  }

  // JWT_EXPIRES_IN must be set in production. Without it, jsonwebtoken
  // issues tokens with no `exp` claim — combined with the missing JWT
  // revocation on `resetPassword` (deferred to PR-3 #7), those tokens
  // become permanent until JWT_SECRET is rotated.
  if (isProd && !config.JWT_EXPIRES_IN) {
    throw new Error('JWT_EXPIRES_IN is required in production');
  }

  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: !isProd,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  // Provide a dev-only fallback for JWT_SECRET so contributors can boot
  // without manually generating one. Never used in production.
  if (!isProd && !config.JWT_SECRET) {
    config.JWT_SECRET =
      'dev-only-jwt-secret-do-not-use-in-production-min-32-chars';
  }

  return config;
}
