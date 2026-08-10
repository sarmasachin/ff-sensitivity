/**
 * Nest admin push live probe using cookie session (login no longer returns JWT in body).
 */
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v;
  }
}

function parseSetCookie(header: string | null): string {
  if (!header) return '';
  // Node fetch may join multiple Set-Cookie; keep name=value pairs only.
  return header
    .split(/,(?=[^;]+?=)/)
    .map((c) => c.split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function main() {
  loadEnv();
  const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
  const email = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const password = process.env.SUPERADMIN_PASSWORD ?? '123456';

  const loginRes = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginJson: any = await loginRes.json().catch(() => ({}));
  if (loginJson?.requiresOtp) {
    console.log('FAIL admin_otp_required — complete OTP in admin UI then retry');
    process.exit(1);
  }
  const rawCookie =
    typeof loginRes.headers.getSetCookie === 'function'
      ? loginRes.headers.getSetCookie().join(',')
      : loginRes.headers.get('set-cookie');
  const cookie = parseSetCookie(rawCookie);
  console.log(
    'login',
    loginRes.status,
    'hasCookie',
    cookie.includes('access') || cookie.length > 10,
    'cookieParts',
    cookie.split(';').length,
  );
  if (!cookie) {
    console.log('FAIL no_session_cookie');
    process.exit(1);
  }

  const listRes = await fetch(`${API}/api/v1/admin/push`, {
    headers: { Cookie: cookie },
  });
  console.log('list', listRes.status);

  const id = `live_probe_${Date.now()}`;
  const putRes = await fetch(`${API}/api/v1/admin/push`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      id,
      title: 'Live Probe',
      body: 'Admin send live probe to Challenge',
      deepLink: 'ffops://challenge',
      audience: 'TOPIC',
      topic: 'all_users',
      scheduleMode: 'now',
    }),
  });
  const putJson: any = await putRes.json().catch(() => ({}));
  console.log(
    'put',
    putRes.status,
    putJson?.error?.code || putJson?.campaign?.status || 'ok',
  );
  if (putRes.status !== 200 && putRes.status !== 201) {
    console.log('put_err', JSON.stringify(putJson).slice(0, 200));
    process.exit(1);
  }

  const sendRes = await fetch(
    `${API}/api/v1/admin/push/${encodeURIComponent(id)}/send`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: '{}',
    },
  );
  const sendJson: any = await sendRes.json().catch(() => ({}));
  console.log(
    'send',
    sendRes.status,
    'delivered',
    sendJson?.campaign?.delivered,
    'failed',
    sendJson?.campaign?.failed,
    'status',
    sendJson?.campaign?.status,
    'err',
    sendJson?.error?.code || '',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
