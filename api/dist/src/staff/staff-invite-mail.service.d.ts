import { ConfigService } from '@nestjs/config';
export declare class StaffInviteMailService {
    private readonly config;
    private transporter?;
    constructor(config: ConfigService);
    send(input: {
        to: string;
        displayName: string;
        temporaryPassword: string;
        resent?: boolean;
    }): Promise<void>;
    private mailer;
}
