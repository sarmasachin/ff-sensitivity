import type { AuthAdmin } from '../auth/current-admin.decorator';
import { NamesService } from './names.service';
import { SaveNamesDto } from './dto/names.dto';
export declare class NamesAdminController {
    private readonly names;
    constructor(names: NamesService);
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
}
