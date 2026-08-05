import { loginOtpEmail } from './login-otp-email';

describe('loginOtpEmail', () => {
  it('renders a professional multipart OTP message', () => {
    const mail = loginOtpEmail({
      code: '123456',
      displayName: 'Sachin',
      expiresMinutes: 10,
    });

    expect(mail.subject).toBe('Your FF Sensitivity Ops verification code');
    expect(mail.subject).not.toContain('123456');
    expect(mail.text).toContain('123456');
    expect(mail.html).toContain('123456');
    expect(mail.html).toContain('app.sensitivitysettings.com');
    expect(mail.html).toContain('Expires in 10 minutes');
  });

  it('escapes profile text before inserting it into HTML', () => {
    const mail = loginOtpEmail({
      code: '654321',
      displayName: '<script>alert(1)</script>',
      expiresMinutes: 10,
    });

    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});
