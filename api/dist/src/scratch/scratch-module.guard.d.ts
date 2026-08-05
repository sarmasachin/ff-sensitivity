import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class ScratchModuleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
