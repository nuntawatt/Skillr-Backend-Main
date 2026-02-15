import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user.type';

/**
 * Parameter decorator ดึง userId (string) จาก request.user.userId
 *
 * Usage:
 *   @CurrentUserId() userId: string
 */
export const CurrentUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException('Missing or invalid authentication');
    }

    return userId;
  },
);
