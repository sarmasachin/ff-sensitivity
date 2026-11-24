import { PrismaService } from '../prisma/prisma.service';
import type { PeerOffsetRow } from './compare-promax-peer-quality';
import type { ProMaxOffsetFrom } from './compare-promax-offset';
export type ProMaxTier = {
    name: ProMaxOffsetFrom;
    minN: number;
    load: () => Promise<PeerOffsetRow[]>;
};
export type ProMaxTierInput = {
    prisma: PrismaService;
    fingers: string;
    role: string;
    deviceLabel: string;
    family: string;
    processorBrand: string;
    processorType: string;
    gpuLabel: string;
    gpuVendor: string;
    dpiPreference: string;
    screenGuard: string;
    bucket: number;
    hzBucket: number;
    ex: string | undefined;
    engine?: string;
};
export declare function buildProMaxTiers(input: ProMaxTierInput): ProMaxTier[];
