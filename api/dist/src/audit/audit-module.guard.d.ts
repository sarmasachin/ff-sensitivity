import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AuditModuleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
