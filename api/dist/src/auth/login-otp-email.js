"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginOtpEmail = loginOtpEmail;
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}
function loginOtpEmail(input) {
    const name = escapeHtml(input.displayName?.trim() || 'Admin');
    const code = escapeHtml(input.code);
    const subject = 'Your FF Sensitivity Ops verification code';
    const text = [
        `Hello ${input.displayName?.trim() || 'Admin'},`,
        '',
        `Your FF Sensitivity Ops verification code is: ${input.code}`,
        `It expires in ${input.expiresMinutes} minutes.`,
        '',
        'If you did not request this sign-in, you can safely ignore this email.',
        'Never share this code with anyone.',
    ].join('\n');
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign-in verification</title>
</head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,'Helvetica Neue',sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Complete your secure FF Sensitivity Ops sign-in.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,.08);">
        <tr>
          <td style="background:#0b1220;padding:28px 32px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:1.6px;color:#93c5fd;text-transform:uppercase;">FF Sensitivity</div>
            <div style="margin-top:7px;font-size:22px;font-weight:700;color:#ffffff;">Ops Security</div>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 32px 12px;">
            <div style="font-size:22px;line-height:30px;font-weight:700;color:#0f172a;">Confirm your sign-in</div>
            <p style="margin:14px 0 0;font-size:15px;line-height:24px;color:#475569;">Hello ${name}, use the verification code below to securely access your admin workspace.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px;">
            <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:14px;padding:22px;text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#1d4ed8;text-transform:uppercase;">Verification code</div>
              <div style="margin-top:10px;font-family:'Courier New',monospace;font-size:34px;line-height:42px;font-weight:700;letter-spacing:8px;color:#1e3a8a;">${code}</div>
              <div style="margin-top:10px;font-size:12px;color:#64748b;">Expires in ${input.expiresMinutes} minutes</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 34px;">
            <div style="border-left:3px solid #f59e0b;background:#fffbeb;padding:13px 14px;font-size:13px;line-height:20px;color:#78350f;">
              Never share this code. Our team will never ask for it by phone, email, or chat.
            </div>
            <p style="margin:22px 0 0;font-size:13px;line-height:21px;color:#64748b;">If you did not request this sign-in, ignore this email and consider changing your password.</p>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:20px 32px;font-size:12px;line-height:18px;color:#94a3b8;">
            Automated security message from FF Sensitivity Ops<br>
            <a href="https://app.sensitivitysettings.com" style="color:#2563eb;text-decoration:none;">app.sensitivitysettings.com</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    return { subject, text, html };
}
//# sourceMappingURL=login-otp-email.js.map