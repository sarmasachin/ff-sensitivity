import { PrismaService } from '../prisma/prisma.service';
import type { NamesPolicyDto, SaveNamesDto } from './dto/names.dto';
export declare class NamesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    ensureDefaults(): Promise<void>;
    private mapPolicy;
    adminGetBundle(): Promise<{
        policy: NamesPolicyDto;
        frames: {
            id: string;
            label: string;
            prefix: string;
            suffix: string;
            premium: boolean;
            enabled: boolean;
        }[];
        fonts: {
            id: string;
            label: string;
            sample: string;
            enabled: boolean;
        }[];
    }>;
    adminSave(adminId: string, dto: SaveNamesDto): Promise<{
        policy: NamesPolicyDto;
        frames: {
            id: string;
            label: string;
            prefix: string;
            suffix: string;
            premium: boolean;
            enabled: boolean;
        }[];
        fonts: {
            id: string;
            label: string;
            sample: string;
            enabled: boolean;
        }[];
    }>;
    userCatalog(): Promise<{
        policy: {
            maxNameChars: number;
            maxBatchSize: number;
            blockSpaces: boolean;
            requireStyleWrap: boolean;
        };
        frames: {
            id: string;
            label: string;
            prefix: string;
            suffix: string;
            premium: boolean;
        }[];
        fonts: {
            id: string;
            label: string;
            sample: string;
        }[];
    }>;
}
