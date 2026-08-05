import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AdminModule, AdminRole } from '@prisma/client';
import { AppError } from '../common/errors/app-error';
import type { AuthAdmin } from '../auth/current-admin.decorator';

// --- Start: Staff admin live wire (Sachin) ---
@Injectable()
export class StaffModuleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthAdmin }>();
    const admin = req.user;
    if (!admin) {
      throw new AppError('AUTH_REQUIRED', 'Sign in required.', 401);
    }
    if (admin.role === AdminRole.SUPER_ADMIN) {
      return true;
    }
    if (!admin.allowedModules?.includes(AdminModule.staff)) {
      throw new AppError(
        'FORBIDDEN_MODULE',
        'You do not have access to Staff.',
        403,
      );
    }
    return true;
  }
}
// --- End: Staff admin live wire (Sachin) ---
