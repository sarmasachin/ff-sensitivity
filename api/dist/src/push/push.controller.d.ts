import type { AuthUser } from '../user-auth/current-user.decorator';
import { PushService } from './push.service';
import { RegisterPushDeviceDto } from './dto/push.dto';
export declare class PushController {
    private readonly push;
    constructor(push: PushService);
    register(user: AuthUser, dto: RegisterPushDeviceDto): Promise<{
        ok: boolean;
        platform: string;
        topics: string[];
        tokenHint: string;
    }>;
    inbox(user: AuthUser): Promise<{
        messages: {
            id: string;
            title: string;
            body: string;
            deepLink: string;
            sentAt: string | null;
        }[];
    }>;
}
