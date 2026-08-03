import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
export type AccessJwtPayload = {
    sub: string;
    email: string;
    role: string;
};
declare const JwtAccessStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtAccessStrategy extends JwtAccessStrategy_base {
    private readonly prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: AccessJwtPayload): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.AdminRole;
        allowedModules: import(".prisma/client").$Enums.AdminModule[];
        mustChangePassword: boolean;
    }>;
}
export {};
