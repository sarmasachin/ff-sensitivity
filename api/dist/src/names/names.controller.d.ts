import { NamesService } from './names.service';
export declare class NamesController {
    private readonly names;
    constructor(names: NamesService);
    catalog(): Promise<{
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
