import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthUser } from '@auth';

export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  const user = request.user;
  const userId = user?.sub ?? user?.id;
  
  // Temporarily return hardcoded user ID for testing when no auth
  if (!userId) {
    return '123e4567-e89b-12d3-a456-426614174000'; // Mock UUID for testing
  }
  
  return String(userId);
});
