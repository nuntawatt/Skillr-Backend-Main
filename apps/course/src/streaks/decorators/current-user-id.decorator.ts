import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // For testing without JWT - use hardcoded UUID
    return request.user?.sub || request.user?.userId || '123e4567-e89b-12d3-a456-426614174000';
  },
);
