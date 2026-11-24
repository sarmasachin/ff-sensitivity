import { AppConfigService } from '../app-config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { SaveCompareDto } from './dto/compare.dto';
import { type ProMaxOffsetQuery } from './compare-promax-offset';
export declare class CompareService {
    private readonly prisma;
    private readonly appConfig;
    constructor(prisma: PrismaService, appConfig: AppConfigService);
    list(fingersRaw?: string, roleRaw?: string): Promise<{
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
    promaxOffset(query: ProMaxOffsetQuery): Promise<{
        shareConflict: import("../app-config/app-config-promax").ProMaxShareConflictKnobs;
        offsetFrom: import("./compare-promax-offset").ProMaxOffsetFrom | `${import("./compare-promax-offset").ProMaxOffsetFrom}_blend`;
        matchCount: number;
        confidence: number;
        averageOffsets: import("./compare-promax-offset").SensitivityOffsets;
        blendFrom?: import("./compare-promax-offset").ProMaxOffsetFrom;
        fieldAgreement?: import("./compare-promax-peer-quality").FieldAgreement;
        community?: import("./compare-promax-community").CommunityPull;
    }>;
    save(userId: string, dto: SaveCompareDto): Promise<{
        id: string;
        createdAt: string;
    }>;
    private sumOffset;
}
