/**
 * Devices admin + heartbeat e2e / security (local Postgres).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const installId = `dev_e2e${Date.now().toString(16).slice(-12)}`;

  {
    const r = await req('GET', '/api/v1/admin/devices');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }
  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      body: { installId },
    });
    r.status === 401
      ? pass('heartbeat_auth_required')
      : fail('heartbeat_auth_required', `status=${r.status}`);
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if (!okAuth(login.status) || !login.json?.accessToken) {
    fail('admin_login', `status=${login.status}`);
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');
  const tok = login.json.accessToken as string;

  {
    const r = await req('GET', '/api/v1/admin/devices', { token: tok });
    r.status === 200 && Array.isArray(r.json?.devices)
      ? pass('admin_list', `count=${r.json.devices.length}`)
      : fail('admin_list', `status=${r.status}`);
  }

  const appUser = await prisma.user.upsert({
    where: { email: 'e2e.devices.app@example.com' },
    update: { isActive: true, coins: 42 },
    create: {
      googleSub: 'e2e-devices-app',
      email: 'e2e.devices.app@example.com',
      displayName: 'Devices App',
      isActive: true,
      coins: 42,
    },
  });
  const userTok = jwt.sign(
    { sub: appUser.id, email: appUser.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/admin/devices', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_admin')
      : fail('user_jwt_blocked_admin', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: userTok,
      body: {
        installId: 'bad id!!',
        brand: 'Google',
        model: 'Pixel',
        androidVersion: '14',
        appVersion: '1.0.0',
        appVersionCode: 1,
      },
    });
    r.status === 400
      ? pass('reject_bad_install_id')
      : fail('reject_bad_install_id', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: userTok,
      body: {
        installId,
        brand: 'Google',
        model: 'Pixel 7',
        androidVersion: '14',
        appVersion: '1.0.0',
        appVersionCode: 1,
        hasFcmToken: false,
        fcmTokenHint: '',
        status: 'BLOCKED',
        coinBalance: 99999,
        blocked: true,
      },
    });
    r.status === 400
      ? pass('reject_privilege_fields')
      : fail('reject_privilege_fields', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: userTok,
      body: {
        installId,
        brand: 'Google',
        model: 'Pixel 7',
        androidVersion: '14',
        appVersion: '1.0.0',
        appVersionCode: 1,
        hasFcmToken: false,
      },
    });
    okAuth(r.status) && r.json?.blocked === false
      ? pass('heartbeat_ok')
      : fail('heartbeat_ok', `status=${r.status}`);
  }

  {
    await prisma.deviceInstall.update({
      where: { installId },
      data: { uninstallSuspectedAt: new Date() },
    });
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: userTok,
      body: {
        installId,
        brand: 'Google',
        model: 'Pixel 7',
        androidVersion: '14',
        appVersion: '1.0.0',
        appVersionCode: 1,
      },
    });
    const row = await prisma.deviceInstall.findUnique({
      where: { installId },
      select: { uninstallSuspectedAt: true },
    });
    okAuth(r.status) && row?.uninstallSuspectedAt === null
      ? pass('heartbeat_clears_uninstall_signal')
      : fail(
          'heartbeat_clears_uninstall_signal',
          `status=${r.status} suspected=${row?.uninstallSuspectedAt}`,
        );
  }

  {
    const r = await req('POST', '/api/v1/devices/heartbeat', {
      token: userTok,
      body: {
        installId,
        brand: '<script>x</script>',
        model: 'Pixel',
        androidVersion: '14',
        appVersion: '1.0.0',
        appVersionCode: 1,
      },
    });
    r.status === 400
      ? pass('reject_script_brand')
      : fail('reject_script_brand', `status=${r.status}`);
  }

  let deviceRowId = '';
  {
    const r = await req('GET', '/api/v1/admin/devices', { token: tok });
    const hit = (r.json?.devices ?? []).find(
      (d: any) => d.deviceId === installId,
    );
    if (hit?.id && hit.coinBalance === 42 && !String(hit.fcmTokenMasked).includes('AAAA')) {
      deviceRowId = hit.id;
      pass('admin_sees_heartbeat', `coins=${hit.coinBalance}`);
    } else {
      fail('admin_sees_heartbeat', JSON.stringify(hit));
    }
  }

  // Register FCM then ensure admin never sees full token
  const fcm = `e2e_fcm_token_${Date.now()}_SECRETVALUE99`;
  {
    const r = await req('POST', '/api/v1/push/device', {
      token: userTok,
      body: {
        token: fcm,
        platform: 'android',
        topics: ['all_users'],
        installId,
      },
    });
    okAuth(r.status) && r.json?.ok === true && !r.json?.token
      ? pass('push_register_with_install')
      : fail('push_register_with_install', `status=${r.status}`);
  }
  {
    await req('POST', '/api/v1/devices/heartbeat', {
      token: userTok,
      body: {
        installId,
        brand: 'Google',
        model: 'Pixel 7',
        androidVersion: '14',
        appVersion: '1.0.0',
        appVersionCode: 1,
        hasFcmToken: true,
      },
    });
    const r = await req('GET', '/api/v1/admin/devices', { token: tok });
    const hit = (r.json?.devices ?? []).find(
      (d: any) => d.deviceId === installId,
    );
    const leaked = JSON.stringify(hit ?? {}).includes('SECRETVALUE99');
    hit?.hasFcmToken === true && !leaked
      ? pass('admin_token_masked_only')
      : fail('admin_token_masked_only', JSON.stringify(hit));
    if (hit?.id) deviceRowId = hit.id;
  }

  if (!deviceRowId) {
    fail('missing_device_row');
  } else {
    {
      const r = await req('POST', `/api/v1/admin/devices/${deviceRowId}/block`, {
        token: tok,
        body: {},
      });
      okAuth(r.status) && r.json?.device?.status === 'BLOCKED'
        ? pass('admin_block')
        : fail('admin_block', `status=${r.status}`);
    }
    {
      const r = await req('POST', '/api/v1/devices/heartbeat', {
        token: userTok,
        body: {
          installId,
          brand: 'Google',
          model: 'Pixel 7',
          androidVersion: '14',
          appVersion: '1.0.0',
          appVersionCode: 1,
        },
      });
      okAuth(r.status) && r.json?.blocked === true
        ? pass('heartbeat_reports_blocked')
        : fail('heartbeat_reports_blocked', JSON.stringify(r.json));
    }
    {
      const r = await req('POST', '/api/v1/push/device', {
        token: userTok,
        body: {
          token: `${fcm}_retry`,
          platform: 'android',
          installId,
        },
      });
      r.status === 403
        ? pass('blocked_cannot_register_push')
        : fail('blocked_cannot_register_push', `status=${r.status}`);
    }
    {
      const r = await req(
        'POST',
        `/api/v1/admin/devices/${deviceRowId}/unblock`,
        { token: tok, body: {} },
      );
      okAuth(r.status) && r.json?.device?.status !== 'BLOCKED'
        ? pass('admin_unblock')
        : fail('admin_unblock', `status=${r.status}`);
    }
    {
      // Re-enable token presence for invalidate test
      await req('POST', '/api/v1/push/device', {
        token: userTok,
        body: { token: `${fcm}_v2`, platform: 'android', installId },
      });
      await req('POST', '/api/v1/devices/heartbeat', {
        token: userTok,
        body: {
          installId,
          brand: 'Google',
          model: 'Pixel 7',
          androidVersion: '14',
          appVersion: '1.0.0',
          appVersionCode: 1,
          hasFcmToken: true,
        },
      });
      const r = await req(
        'POST',
        `/api/v1/admin/devices/${deviceRowId}/invalidate-token`,
        { token: tok, body: {} },
      );
      okAuth(r.status) && r.json?.device?.hasFcmToken === false
        ? pass('admin_invalidate_token')
        : fail('admin_invalidate_token', `status=${r.status}`);
    }
    {
      const r = await req('POST', `/api/v1/admin/devices/bad id!!/block`, {
        token: tok,
        body: {},
      });
      r.status === 400 || r.status === 404
        ? pass('reject_bad_row_id')
        : fail('reject_bad_row_id', `status=${r.status}`);
    }
  }

  // Module ACL
  const noDevHash = await bcrypt.hash('NoDevPass9', 12);
  await prisma.admin.upsert({
    where: { email: 'e2e.devices.denied@example.com' },
    update: {
      passwordHash: noDevHash,
      role: 'VIEWER',
      allowedModules: ['push'],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.devices.denied@example.com',
      passwordHash: noDevHash,
      role: 'VIEWER',
      allowedModules: ['push'],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const deniedLogin = await req('POST', '/api/v1/auth/login', {
    body: {
      email: 'e2e.devices.denied@example.com',
      password: 'NoDevPass9',
    },
  });
  if (okAuth(deniedLogin.status) && deniedLogin.json?.accessToken) {
    pass('denied_login');
    const dTok = deniedLogin.json.accessToken as string;
    const list = await req('GET', '/api/v1/admin/devices', { token: dTok });
    list.status === 403
      ? pass('module_acl_list')
      : fail('module_acl_list', `status=${list.status}`);
  } else {
    fail('denied_login', `status=${deniedLogin.status}`);
  }

  // Viewer with devices — read ok, mutate forbidden
  const viewerHash = await bcrypt.hash('DevViewer9', 12);
  await prisma.admin.upsert({
    where: { email: 'e2e.devices.viewer@example.com' },
    update: {
      passwordHash: viewerHash,
      role: 'VIEWER',
      allowedModules: ['devices'],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.devices.viewer@example.com',
      passwordHash: viewerHash,
      role: 'VIEWER',
      allowedModules: ['devices'],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const viewerLogin = await req('POST', '/api/v1/auth/login', {
    body: {
      email: 'e2e.devices.viewer@example.com',
      password: 'DevViewer9',
    },
  });
  if (okAuth(viewerLogin.status) && viewerLogin.json?.accessToken && deviceRowId) {
    pass('viewer_login');
    const vTok = viewerLogin.json.accessToken as string;
    const list = await req('GET', '/api/v1/admin/devices', { token: vTok });
    list.status === 200
      ? pass('viewer_can_list')
      : fail('viewer_can_list', `status=${list.status}`);
    const block = await req(
      'POST',
      `/api/v1/admin/devices/${deviceRowId}/block`,
      { token: vTok, body: {} },
    );
    block.status === 403
      ? pass('viewer_cannot_block')
      : fail('viewer_cannot_block', `status=${block.status}`);
  } else {
    fail('viewer_login', `status=${viewerLogin.status}`);
  }

  // Cleanup install
  await prisma.deviceInstall.deleteMany({ where: { installId } });
  await prisma.devicePushToken.deleteMany({
    where: { userId: appUser.id },
  });

  printSummary();
  const failed = checks.filter((c) => !c.ok).length;
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

function printSummary() {
  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
