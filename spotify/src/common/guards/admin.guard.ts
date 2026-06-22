import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * Shape of the user payload `JwtStrategy.validate()` attaches to
 * `req.user`. AdminGuard runs after JwtAuthGuard so `user` is
 * always set, but we still type the field to keep the rest of the
 * guard free of unsafe `any` operations.
 */
interface RequestWithUser extends Request {
  user?: { role: string };
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required for this operation');
    }

    return true;
  }
}
