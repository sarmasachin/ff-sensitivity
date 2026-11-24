export declare class SensitivityValuesDto {
    general: number;
    redDot: number;
    scope2x: number;
    scope4x: number;
    sniper: number;
    freeLook: number;
    fireButton: number;
}
export declare class SaveCompareDto {
    deviceLabel: string;
    fingers: string;
    role: string;
    dpiPreference: string;
    screenGuard: string;
    feedback: 'too_slow' | 'perfect' | 'too_fast';
    suggested: SensitivityValuesDto;
    actual: SensitivityValuesDto;
    ramGb?: number;
    processorBrand?: string;
    processorType?: string;
    gpuLabel?: string;
    gpuVendor?: string;
    refreshHz?: number;
    engine?: string;
}
