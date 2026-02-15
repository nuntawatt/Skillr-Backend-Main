import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../types/auth-user.type';

/**
 * Parameter decorator ที่ดึง user จาก request.user (set โดย JwtStrategy)
 *
 * Usage:
 *   @CurrentUser() user: AuthUser           → ได้ทั้ง object
 *   @CurrentUser('userId') userId: string    → ได้แค่ field เดียว
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!data) return user;
    return user?.[data];
  },
);
