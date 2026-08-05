import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AdminModule, AdminRole } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import type { AuthAdmin } from '../auth/current-admin.decorator';

// --- Start: Scratch live wire (Sachin) ---
@Injectable()
export class ScratchModuleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthAdmin }>();
    const admin = req.user;
    if (!admin) {
      throw new AppError('AUTH_REQUIRED', 'Sign in required.', 401);
    }
    if (admin.role === AdminRole.SUPER_ADMIN) {
      return true;
    }
    if (!admin.allowedModules?.includes(AdminModule.scratch)) {
      throw new AppError(
        'FORBIDDEN_MODULE',
        'You do not have access to Scratch.',
        403,
      );
    }
    return true;
  }
}
// --- End: Scratch live wire (Sachin) ---
