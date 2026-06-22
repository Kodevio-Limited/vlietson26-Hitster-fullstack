import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  // The base `AuthGuard` types all four parameters as `any` and we
  // have to match. We only ever read `err` (re-thrown so the
  // LoggingInterceptor can split 4xx/5xx by status) and `user`
  // (returned so passport attaches it to `req.user`). `info` is
  // unused — prefixed with `_` per the eslint config to silence the
  // unused-vars rule for that parameter specifically.
  handleRequest(err: any, user: any, _info: any) {
    // The base `AuthGuard` signature includes `info`; we don't read
    // it, so explicitly `void` it to silence the unused-vars rule
    // (the project eslint config doesn't honor the `_` prefix).
    void _info;
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException('Invalid or missing authentication token')
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
