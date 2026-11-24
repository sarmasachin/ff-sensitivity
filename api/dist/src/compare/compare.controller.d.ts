import type { AuthUser } from '../user-auth/current-user.decorator';
import { CompareService } from './compare.service';
import { SaveCompareDto } from './dto/compare.dto';
export declare class CompareController {
    private readonly compare;
    constructor(compare: CompareService);
    list(fingers?: string, role?: string): Promise<{
        offsetFrom: string;
        averageGeneralOffset: number | null;
        items: {
            id: string;
            displayName: string;
            deviceLabel: string;
            fingers: string;
            role: string;
            dpiPreference: string;
            screenGuard: string;
            feedback: string;
            suggested: {
                general: number;
                redDot: number;
                scope2x: number;
                scope4x: number;
                sniper: number;
                freeLook: number;
                fireButton: number;
            };
            actual: {
                general: number;
                redDot: number;
                scope2x: number;
                scope4x: number;
                sniper: number;
                freeLook: number;
                fireButton: number;
            };
            createdAt: string;
        }[];
    }>;
    promaxOffset(user: AuthUser, fingers?: string, role?: string, deviceLabel?: string, ramGb?: string, processorBrand?: string, processorType?: string, gpuLabel?: string, gpuVendor?: string, dpiPreference?: string, screenGuard?: string, refreshHz?: string, engine?: string): Promise<{
        shareConflict: import("../app-config/app-config-promax").ProMaxShareConflictKnobs;
        offsetFrom: import("./compare-promax-offset").ProMaxOffsetFrom | `${import("./compare-promax-offset").ProMaxOffsetFrom}_blend`;
        matchCount: number;
        confidence: number;
        averageOffsets: import("./compare-promax-offset").SensitivityOffsets;
        blendFrom?: import("./compare-promax-offset").ProMaxOffsetFrom;
        fieldAgreement?: import("./compare-promax-peer-quality").FieldAgreement;
        community?: import("./compare-promax-community").CommunityPull;
    }>;
    save(user: AuthUser, dto: SaveCompareDto): Promise<{
        id: string;
        createdAt: string;
    }>;
}
