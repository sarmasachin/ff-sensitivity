import { PrismaService } from '../prisma/prisma.service';
export declare class UsersScreenJourneyService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    forUser(userIdRaw: string, daysRaw?: string): Promise<{
        days: number;
        since: string;
        summary: {
            visits: number;
            totalSeconds: number;
            uniqueScreens: number;
        };
        byScreen: {
            screen: string;
            visits: number;
            seconds: number;
        }[];
        timeline: {
            id: string;
            screen: string;
            durationMs: number;
            seconds: number;
            at: string;
        }[];
    }>;
}
