import { type AuthUser } from '../user-auth/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { AnonOpenDto, TrackAnalyticsEventDto } from './dto/analytics.dto';
export declare class AnalyticsController {
    private readonly analytics;
    constructor(analytics: AnalyticsService);
    track(user: AuthUser, dto: TrackAnalyticsEventDto): Promise<{
        ok: false;
    } | {
        ok: true;
    }>;
    anonOpen(dto: AnonOpenDto): Promise<{
        ok: false;
    } | {
        ok: true;
    }>;
}
