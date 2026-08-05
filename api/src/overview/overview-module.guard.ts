import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import type { AuthAdmin } from '../auth/current-admin.decorator';

// --- Start: Overview KPIs live wire (Sachin) ---
/** Home pulse — any signed-in admin seat (read-only aggregates). */
@Injectable()
export class OverviewModuleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthAdmin }>();
    const admin = req.user;
    if (!admin) {
      throw new AppError('AUTH_REQUIRED', 'Sign in required.', 401);
    }
    return true;
  }
}
// --- End: Overview KPIs live wire (Sachin) ---
