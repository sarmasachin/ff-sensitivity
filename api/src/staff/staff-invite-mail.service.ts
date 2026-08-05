import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppError } from '../common/errors/app-error';
import { staffInviteEmail } from './staff-invite-email';

@Injectable()
export class StaffInviteMailService {
  private transporter?: Transporter;

  constructor(private readonly config: ConfigService) {}

  async send(input: {
    to: string;
    displayName: string;
    temporaryPassword: string;
    resent?: boolean;
  }) {
    const fromEmail = this.config.getOrThrow<string>('SMTP_FROM_EMAIL');
    const fromName =
      this.config.get<string>('SMTP_FROM_NAME') ?? 'FF Sensitivity Ops';
    const loginUrl = (
      this.config.get<string>('CORS_ORIGIN') ??
      'https://app.sensitivitysettings.com'
    ).replace(/\/$/, '');
    const content = staffInviteEmail({
      displayName: input.displayName,
      email: input.to,
      temporaryPassword: input.temporaryPassword,
      loginUrl,
      resent: input.resent,
    });

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
        'STAFF_INVITE_DELIVERY_FAILED',
        'Invite was not emailed. Check SMTP settings and try again.',
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
