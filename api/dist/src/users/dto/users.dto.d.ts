export declare class UserNoteDto {
    note: string;
}
export declare class UserStatusDto {
    action: 'restrict' | 'suspend' | 'restore';
    note?: string;
}
