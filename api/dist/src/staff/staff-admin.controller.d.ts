import type { AuthAdmin } from '../auth/current-admin.decorator';
import { StaffService } from './staff.service';
import { StaffInviteDto, StaffModulesDto } from './dto/staff.dto';
export declare class StaffAdminController {
    private readonly staff;
    constructor(staff: StaffService);
    list(): Promise<{
        staff: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.AdminRole;
            status: "ACTIVE" | "DISABLED" | "INVITED";
            modules: string[];
            lastLoginLabel: string;
            invitedAtLabel: string;
            note: string;
        }[];
    }>;
    invite(admin: AuthAdmin, dto: StaffInviteDto): Promise<{
        staff: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.AdminRole;
            status: "ACTIVE" | "DISABLED" | "INVITED";
            modules: string[];
            lastLoginLabel: string;
            invitedAtLabel: string;
            note: string;
        };
        temporaryPassword: string;
    }>;
    setModules(admin: AuthAdmin, id: string, dto: StaffModulesDto): Promise<{
        staff: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.AdminRole;
            status: "ACTIVE" | "DISABLED" | "INVITED";
            modules: string[];
            lastLoginLabel: string;
            invitedAtLabel: string;
            note: string;
        };
    }>;
    disable(admin: AuthAdmin, id: string): Promise<{
        staff: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.AdminRole;
            status: "ACTIVE" | "DISABLED" | "INVITED";
            modules: string[];
            lastLoginLabel: string;
            invitedAtLabel: string;
            note: string;
        };
    }>;
    enable(admin: AuthAdmin, id: string): Promise<{
        staff: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.AdminRole;
            status: "ACTIVE" | "DISABLED" | "INVITED";
            modules: string[];
            lastLoginLabel: string;
            invitedAtLabel: string;
            note: string;
        };
    }>;
    resend(admin: AuthAdmin, id: string): Promise<{
        staff: {
            id: string;
            name: string;
            email: string;
            role: import(".prisma/client").$Enums.AdminRole;
            status: "ACTIVE" | "DISABLED" | "INVITED";
            modules: string[];
            lastLoginLabel: string;
            invitedAtLabel: string;
            note: string;
        };
        temporaryPassword: string;
    }>;
}
