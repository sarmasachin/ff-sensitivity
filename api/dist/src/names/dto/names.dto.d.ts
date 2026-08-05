export declare class NameFrameDto {
    id: string;
    label: string;
    prefix: string;
    suffix: string;
    premium: boolean;
    enabled: boolean;
}
export declare class NameFontDto {
    id: string;
    label: string;
    sample: string;
    enabled: boolean;
}
export declare class NamesPolicyDto {
    maxNameChars: number;
    maxBatchSize: number;
    blockSpaces: boolean;
    requireStyleWrap: boolean;
    remotePackEnabled: boolean;
    remotePackUrl?: string;
}
export declare class SaveNamesDto {
    policy: NamesPolicyDto;
    frames: NameFrameDto[];
    fonts: NameFontDto[];
}
