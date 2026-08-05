import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class UsersModuleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
