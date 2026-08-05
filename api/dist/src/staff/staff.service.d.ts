import { PrismaService } from '../prisma/prisma.service';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { SettingsService } from '../settings/settings.service';
import type { StaffInviteDto, StaffModulesDto } from './dto/staff.dto';
import { StaffInviteMailService } from './staff-invite-mail.service';
export declare class StaffService {
    private readonly prisma;
    private readonly settings;
    private readonly inviteMail;
    constructor(prisma: PrismaService, settings: SettingsService, inviteMail: StaffInviteMailService);
    private assertCanMutate;
    private assertCanManageTarget;
    private toRow;
    private loadRow;
    adminList(): Promise<{
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
    invite(actor: AuthAdmin, dto: StaffInviteDto): Promise<{
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
        inviteSent: true;
    }>;
    setModules(actor: AuthAdmin, idRaw: string, dto: StaffModulesDto): Promise<{
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
    disable(actor: AuthAdmin, idRaw: string): Promise<{
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
    enable(actor: AuthAdmin, idRaw: string): Promise<{
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
    resendInvite(actor: AuthAdmin, idRaw: string): Promise<{
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
        inviteSent: true;
    }>;
}
