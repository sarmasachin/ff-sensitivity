export declare class DeviceHeartbeatDto {
    installId: string;
    brand?: string;
    model?: string;
    androidVersion?: string;
    appVersion?: string;
    appVersionCode?: number;
    hasFcmToken?: boolean;
    fcmTokenHint?: string;
}
export declare class PatchDeviceNoteDto {
    note: string;
}
