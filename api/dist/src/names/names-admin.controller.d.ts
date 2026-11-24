import type { AuthAdmin } from '../auth/current-admin.decorator';
import { NamesService } from './names.service';
import { NamesAdminItemsService } from './names-admin-items.service';
import { NameFontDto, NameFrameDto, SaveNamesDto } from './dto/names.dto';
export declare class NamesAdminController {
    private readonly names;
    private readonly items;
    constructor(names: NamesService, items: NamesAdminItemsService);
    get(): Promise<{
        policy: import("./dto/names.dto").NamesPolicyDto;
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
    save(admin: AuthAdmin, dto: SaveNamesDto): Promise<{
        policy: import("./dto/names.dto").NamesPolicyDto;
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
    createFrame(admin: AuthAdmin, dto: NameFrameDto): Promise<{
        id: string;
        label: string;
        prefix: string;
        suffix: string;
        premium: boolean;
        enabled: boolean;
    }>;
    updateFrame(admin: AuthAdmin, id: string, dto: NameFrameDto): Promise<{
        id: string;
        label: string;
        prefix: string;
        suffix: string;
        premium: boolean;
        enabled: boolean;
    }>;
    deleteFrame(admin: AuthAdmin, id: string): Promise<{
        ok: true;
        id: string;
    }>;
    updateFont(admin: AuthAdmin, id: string, dto: NameFontDto): Promise<{
        id: string;
        label: string;
        sample: string;
        enabled: boolean;
    }>;
}
