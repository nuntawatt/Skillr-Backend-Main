import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthUser } from '@auth';

export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  const user = request.user;
  const userId = user?.sub ?? user?.id;
  if (!userId) {
    throw new UnauthorizedException('Missing authenticated user');
  }
  return String(userId);
});
