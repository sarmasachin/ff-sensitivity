export declare class StaffInviteDto {
    name: string;
    email: string;
    role: 'ADMIN' | 'SUB_ADMIN' | 'VIEWER';
    modules: string[];
    currentPassword?: string;
}
export declare class StaffModulesDto {
    modules: string[];
}
