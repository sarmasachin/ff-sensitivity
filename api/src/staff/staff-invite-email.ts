function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function staffInviteEmail(input: {
  displayName: string;
  email: string;
  temporaryPassword: string;
  loginUrl: string;
  resent?: boolean;
}) {
  const name = escapeHtml(input.displayName.trim() || 'Staff');
  const email = escapeHtml(input.email);
  const password = escapeHtml(input.temporaryPassword);
  const loginUrl = escapeHtml(input.loginUrl);
  const action = input.resent ? 'password reset' : 'invitation';
  const subject = input.resent
    ? 'Your FF Sensitivity Ops invite was resent'
    : 'You are invited to FF Sensitivity Ops';

  const text = [
    `Hello ${input.displayName.trim() || 'Staff'},`,
    '',
    input.resent
      ? 'Your FF Sensitivity Ops invite credentials were reset by an administrator.'
      : 'You have been invited to FF Sensitivity Ops.',
    '',
    `Sign in at: ${input.loginUrl}`,
    `Email: ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    '',
    'You must change this password after your first successful sign-in.',
    'Never share this password. If you did not expect this email, contact your Super Admin.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Staff ${action}</title>
</head>
<body style="margin:0;background:#f1f5f9;font-family:Arial,'Helvetica Neue',sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your FF Sensitivity Ops staff ${action} is ready.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,.08);">
        <tr>
          <td style="background:#0b1220;padding:28px 32px;">
            <div style="font-size:12px;font-weight:700;letter-spacing:1.6px;color:#93c5fd;text-transform:uppercase;">FF Sensitivity</div>
            <div style="margin-top:7px;font-size:22px;font-weight:700;color:#ffffff;">Ops Staff Access</div>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 32px 12px;">
            <div style="font-size:22px;line-height:30px;font-weight:700;color:#0f172a;">${input.resent ? 'Invite credentials reset' : 'You are invited'}</div>
            <p style="margin:14px 0 0;font-size:15px;line-height:24px;color:#475569;">Hello ${name}, use the temporary credentials below to access the staff console. You will be asked to change the password after sign-in.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px;">
            <div style="border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:18px 20px;">
              <div style="font-size:12px;color:#64748b;">Login</div>
              <div style="margin-top:4px;font-size:14px;"><a href="${loginUrl}" style="color:#2563eb;text-decoration:none;">${loginUrl}</a></div>
              <div style="margin-top:14px;font-size:12px;color:#64748b;">Email</div>
              <div style="margin-top:4px;font-size:14px;font-weight:600;color:#0f172a;">${email}</div>
              <div style="margin-top:14px;font-size:12px;color:#64748b;">Temporary password</div>
              <div style="margin-top:6px;font-family:'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:1px;color:#1e3a8a;">${password}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 34px;">
            <div style="border-left:3px solid #f59e0b;background:#fffbeb;padding:13px 14px;font-size:13px;line-height:20px;color:#78350f;">
              Change this password immediately after login. Our team will never ask for it by phone or chat.
            </div>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:20px 32px;font-size:12px;line-height:18px;color:#94a3b8;">
            Automated message from FF Sensitivity Ops
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
