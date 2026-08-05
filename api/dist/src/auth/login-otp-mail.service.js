"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginOtpMailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer_1 = __importDefault(require("nodemailer"));
const app_error_1 = require("../common/errors/app-error");
const login_otp_email_1 = require("./login-otp-email");
let LoginOtpMailService = class LoginOtpMailService {
    config;
    transporter;
    constructor(config) {
        this.config = config;
    }
    async send(input) {
        const fromEmail = this.config.getOrThrow('SMTP_FROM_EMAIL');
        const fromName = this.config.get('SMTP_FROM_NAME') ?? 'FF Sensitivity Ops';
        const content = (0, login_otp_email_1.loginOtpEmail)(input);
        try {
            await this.mailer().sendMail({
                from: { name: fromName, address: fromEmail },
                to: input.to,
                subject: content.subject,
                text: content.text,
                html: content.html,
            });
        }
        catch {
            throw new app_error_1.AppError('AUTH_OTP_DELIVERY_FAILED', 'We could not send the verification code. Please try again.', 503);
        }
    }
    mailer() {
        if (this.transporter)
            return this.transporter;
        const port = Number(this.config.get('SMTP_PORT') ?? 465);
        this.transporter = nodemailer_1.default.createTransport({
            host: this.config.get('SMTP_HOST') ?? 'smtp.hostinger.com',
            port,
            secure: port === 465,
            auth: {
                user: this.config.getOrThrow('SMTP_USER'),
                pass: this.config.getOrThrow('SMTP_PASSWORD'),
            },
        });
        return this.transporter;
    }
};
exports.LoginOtpMailService = LoginOtpMailService;
exports.LoginOtpMailService = LoginOtpMailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LoginOtpMailService);
//# sourceMappingURL=login-otp-mail.service.js.map