import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class ChallengeModuleGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
