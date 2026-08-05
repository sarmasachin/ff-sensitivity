/**
 * Extra devices security cross-checks (beyond e2e:devices).
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

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

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}
function okAuth(status: number) {
  return status === 200 || status === 201;
}

async function req(
  method: string,
  pathName: string,
  opts?: { token?: string; body?: unknown },
) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function hb(installId: string, extra: Record<string, unknown> = {}) {
  return {
    installId,
    brand: 'Google',
    model: 'Pixel',
    androidVersion: '14',
    appVersion: '1.0.0',
    appVersionCode: 1,
    ...extra,
  };
}

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(16).slice(-10);
  const installA = `dev_hijacka${stamp}`;
  const installB = `dev_hijackb${stamp}`;

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const tok = login.json?.accessToken as string | undefined;
  if (!tok) {
    fail('admin_login');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');

  const userA = await prisma.user.upsert({
    where: { email: 'e2e.devices.a@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-devices-a',
      email: 'e2e.devices.a@example.com',
      displayName: 'DevA',
      isActive: true,
    },
  });
  const userB = await prisma.user.upsert({
    where: { email: 'e2e.devices.b@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-devices-b',
      email: 'e2e.devices.b@example.com',
      displayName: 'DevB',
      isActive: true,
    },
  });
  const tokA = jwt.sign(
    { sub: userA.id, email: userA.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  const tokB = jwt.sign(
    { sub: userB.id, email: userB.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: tokA,
      body: hb(installA),
    });
    okAuth(r.status)
      ? pass('owner_heartbeat')
      : fail('owner_heartbeat', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: tokB,
      body: hb(installA),
    });
    r.status === 403
      ? pass('reject_install_hijack')
      : fail(
          'reject_install_hijack',
          `status=${r.status} — other user can bind same installId`,
        );
  }

  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: tokA,
      body: hb(installB, {
        hasFcmToken: true,
        fcmTokenHint: 'AAAA…EVIL',
      }),
    });
    okAuth(r.status);
    const list = await req('GET', '/api/v1/admin/devices', { token: tok });
    const hit = (list.json?.devices ?? []).find(
      (d: any) => d.deviceId === installB,
    );
    hit?.hasFcmToken === false
      ? pass('ignore_client_fake_fcm_flag')
      : fail('ignore_client_fake_fcm_flag', JSON.stringify(hit));
  }

  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: tokA,
      body: hb(`dev_hint${stamp}`, {
        androidVersion: '<script>x</script>',
      }),
    });
    r.status === 400
      ? pass('reject_script_android_version')
      : fail('reject_script_android_version', `status=${r.status}`);
  }

  let rowId = '';
  {
    const list = await req('GET', '/api/v1/admin/devices', { token: tok });
    rowId =
      (list.json?.devices ?? []).find((d: any) => d.deviceId === installA)?.id ??
      '';
  }

  if (rowId) {
    {
      const r = await req('PATCH', `/api/v1/admin/devices/${rowId}/note`, {
        token: tok,
        body: { note: '<script>alert(1)</script>' },
      });
      r.status === 400
        ? pass('reject_script_note')
        : fail('reject_script_note', `status=${r.status}`);
    }
    {
      const r = await req('PATCH', `/api/v1/admin/devices/${rowId}/note`, {
        token: tok,
        body: { note: 'Clean ops note' },
      });
      okAuth(r.status) && r.json?.device?.note === 'Clean ops note'
        ? pass('patch_note_ok')
        : fail('patch_note_ok', `status=${r.status}`);
    }
  } else {
    fail('missing_row_for_note');
  }

  // Cleanup
  await prisma.deviceInstall.deleteMany({
    where: {
      installId: {
        in: [installA, installB, `dev_hint${stamp}`],
      },
    },
  });

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
