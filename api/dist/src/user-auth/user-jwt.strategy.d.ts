import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
export type UserJwtPayload = {
    sub: string;
    email: string;
    aud: 'user';
    tv?: number;
};
declare const UserJwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class UserJwtStrategy extends UserJwtStrategy_base {
    private readonly prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: UserJwtPayload): Promise<{
        id: string;
        email: string;
        displayName: string;
    }>;
}
export {};
