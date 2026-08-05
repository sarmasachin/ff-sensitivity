import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class PushModuleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
