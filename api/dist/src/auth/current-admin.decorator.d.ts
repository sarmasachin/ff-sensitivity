import { AdminModule, AdminRole } from '@prisma/client';
export type AuthAdmin = {
    id: string;
    email: string;
    role: AdminRole;
    allowedModules: AdminModule[];
    mustChangePassword: boolean;
};
export declare const CurrentAdmin: (...dataOrPipes: unknown[]) => ParameterDecorator;
