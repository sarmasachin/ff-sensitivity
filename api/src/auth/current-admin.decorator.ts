import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminModule, AdminRole } from '@prisma/client';

export type AuthAdmin = {
  id: string;
  email: string;
  role: AdminRole;
  allowedModules: AdminModule[];
  mustChangePassword: boolean;
};

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthAdmin => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthAdmin }>();
    return req.user;
  },
);
