import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppError } from '../common/errors/app-error';
import { loginOtpEmail } from './login-otp-email';

@Injectable()
export class LoginOtpMailService {
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async send(input: {
    to: string;
    code: string;
    displayName?: string | null;
    expiresMinutes: number;
  }) {
    const fromEmail = this.config.getOrThrow<string>('SMTP_FROM_EMAIL');
    const fromName =
      this.config.get<string>('SMTP_FROM_NAME') ?? 'FF Sensitivity Ops';
    const content = loginOtpEmail(input);

    try {
      await this.mailer().sendMail({
        from: { name: fromName, address: fromEmail },
        to: input.to,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    } catch {
      throw new AppError(
        'AUTH_OTP_DELIVERY_FAILED',
        'We could not send the verification code. Please try again.',
        503,
      );
    }
  }

  private mailer() {
    if (this.transporter) return this.transporter;
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 465);
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST') ?? 'smtp.hostinger.com',
      port,
      secure: port === 465,
      auth: {
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.config.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });
    return this.transporter;
  }
}
