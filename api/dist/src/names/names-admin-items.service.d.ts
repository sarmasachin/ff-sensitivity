import { PrismaService } from '../prisma/prisma.service';
import type { NameFontDto, NameFrameDto } from './dto/names.dto';
export declare class NamesAdminItemsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createFrame(adminId: string, dto: NameFrameDto): Promise<{
        id: string;
        label: string;
        prefix: string;
        suffix: string;
        premium: boolean;
        enabled: boolean;
    }>;
    updateFrame(adminId: string, rawId: string, dto: NameFrameDto): Promise<{
        id: string;
        label: string;
        prefix: string;
        suffix: string;
        premium: boolean;
        enabled: boolean;
    }>;
    deleteFrame(adminId: string, rawId: string): Promise<{
        ok: true;
        id: string;
    }>;
    updateFont(adminId: string, rawId: string, dto: NameFontDto): Promise<{
        id: string;
        label: string;
        sample: string;
        enabled: boolean;
    }>;
    private otherFonts;
}
