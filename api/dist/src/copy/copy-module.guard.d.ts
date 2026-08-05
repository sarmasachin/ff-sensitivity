import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class CopyModuleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
