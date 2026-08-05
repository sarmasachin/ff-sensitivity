import { ConfigService } from '@nestjs/config';
export declare class LoginOtpMailService {
    private readonly config;
    private transporter?;
    constructor(config: ConfigService);
    send(input: {
        to: string;
        code: string;
        displayName?: string | null;
        expiresMinutes: number;
    }): Promise<void>;
    private mailer;
}
