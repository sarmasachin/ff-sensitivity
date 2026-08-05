import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class NamesModuleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
