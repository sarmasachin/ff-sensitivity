import type { AuthUser } from '../user-auth/current-user.decorator';
import { DevicesService } from './devices.service';
import { DeviceHeartbeatDto } from './dto/devices.dto';
export declare class DevicesController {
    private readonly devices;
    constructor(devices: DevicesService);
    heartbeat(user: AuthUser, dto: DeviceHeartbeatDto): Promise<{
        ok: boolean;
        blocked: boolean;
        message: string;
    } | {
        ok: boolean;
        blocked: boolean;
        message?: undefined;
    }>;
}
