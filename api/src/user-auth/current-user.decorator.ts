import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// --- Start: Redeem live wire (Sachin) ---
export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return req.user;
  },
);
// --- End: Redeem live wire (Sachin) ---
