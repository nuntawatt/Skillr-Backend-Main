import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@auth';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;
    if (!data) return user;

    const record = user as Record<string, unknown> | undefined;
    return record?.[data];
  },
);
