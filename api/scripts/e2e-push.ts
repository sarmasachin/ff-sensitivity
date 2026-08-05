/**
 * Push admin + device inbox e2e / security (local Postgres).
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

  {
    const r = await req('GET', '/api/v1/admin/push');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }
  {
    const r = await req('POST', '/api/v1/push/device', {
      body: { token: 'android_test_token_xx' },
    });
    r.status === 401
      ? pass('device_auth_required')
      : fail('device_auth_required', `status=${r.status}`);
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
    const r = await req('GET', '/api/v1/admin/push', { token: tok });
    r.status === 200 && Array.isArray(r.json?.campaigns)
      ? pass('admin_list', `count=${r.json.campaigns.length}`)
      : fail('admin_list', `status=${r.status}`);
  }

  const cid = `e2e_push_${Date.now().toString(36)}`;
  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: cid,
        title: 'E2E Push',
        body: 'Hello from e2e',
        deepLink: 'ffops://challenge',
        audience: 'ALL',
        topic: '',
        scheduleMode: 'draft',
      },
    });
    okAuth(r.status) && r.json?.campaign?.id === cid
      ? pass('admin_upsert')
      : fail('admin_upsert', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: `${cid}_bad`,
        title: 'Evil',
        body: 'phish',
        deepLink: 'https://evil.example',
        audience: 'ALL',
        scheduleMode: 'draft',
      },
    });
    r.status === 400
      ? pass('reject_https_deeplink')
      : fail('reject_https_deeplink', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: `${cid}_js`,
        title: '<script>x</script>',
        body: 'ok body here',
        deepLink: 'ffops://home',
        audience: 'ALL',
        scheduleMode: 'draft',
      },
    });
    r.status === 400
      ? pass('reject_script_title')
      : fail('reject_script_title', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: `${cid}_topic`,
        title: 'Topic push',
        body: 'Topic body ok',
        deepLink: 'ffops://names',
        audience: 'TOPIC',
        topic: 'Bad Topic!',
        scheduleMode: 'draft',
      },
    });
    r.status === 400
      ? pass('reject_bad_topic')
      : fail('reject_bad_topic', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: `${cid}_cred`,
        title: 'Creds',
        body: 'nope',
        deepLink: 'ffops://user:pass@home',
        audience: 'ALL',
        scheduleMode: 'draft',
      },
    });
    r.status === 400
      ? pass('reject_deeplink_credentials')
      : fail('reject_deeplink_credentials', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: `${cid}_unk`,
        title: 'Unknown path',
        body: 'nope',
        deepLink: 'ffops://not_a_real_route',
        audience: 'ALL',
        scheduleMode: 'draft',
      },
    });
    r.status === 400
      ? pass('reject_unknown_path')
      : fail('reject_unknown_path', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: cid,
        title: 'Priv',
        body: 'nope body',
        deepLink: 'ffops://home',
        audience: 'ALL',
        scheduleMode: 'draft',
        status: 'SENT',
        delivered: 99999,
      },
    });
    r.status === 400
      ? pass('reject_privilege_fields')
      : fail('reject_privilege_fields', `status=${r.status}`);
  }

  // Viewer with push module cannot send
  const viewerHash = await bcrypt.hash('ViewerPass9', 12);
  const viewer = await prisma.admin.upsert({
    where: { email: 'e2e.push.viewer@example.com' },
    update: {
      passwordHash: viewerHash,
      role: 'VIEWER',
      allowedModules: ['push'],
      isActive: true,
    },
    create: {
      email: 'e2e.push.viewer@example.com',
      passwordHash: viewerHash,
      role: 'VIEWER',
      allowedModules: ['push'],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const viewerLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: viewer.email, password: 'ViewerPass9' },
  });
  if (okAuth(viewerLogin.status) && viewerLogin.json?.accessToken) {
    pass('viewer_login');
    const vTok = viewerLogin.json.accessToken as string;
    const list = await req('GET', '/api/v1/admin/push', { token: vTok });
    list.status === 200
      ? pass('viewer_can_list')
      : fail('viewer_can_list', `status=${list.status}`);
    const send = await req('POST', `/api/v1/admin/push/${cid}/send`, {
      token: vTok,
      body: {},
    });
    send.status === 403
      ? pass('viewer_cannot_send')
      : fail('viewer_cannot_send', `status=${send.status}`);
  } else {
    fail('viewer_login', `status=${viewerLogin.status}`);
  }

  // App user device + inbox
  const appUser = await prisma.user.upsert({
    where: { email: 'e2e.push.app@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-push-app',
      email: 'e2e.push.app@example.com',
      displayName: 'Push App',
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: appUser.id, email: appUser.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  {
    const r = await req('POST', '/api/v1/push/device', {
      token: userTok,
      body: {
        token: `android_e2e_${Date.now()}`,
        platform: 'android',
        topics: ['feature_names'],
      },
    });
    okAuth(r.status) && r.json?.ok === true && !r.json?.token
      ? pass('device_register_no_token_echo')
      : fail('device_register_no_token_echo', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/push', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_on_admin')
      : fail('user_jwt_blocked_on_admin', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/push/${cid}/send`, {
      token: tok,
      body: {},
    });
    okAuth(r.status) &&
    r.json?.campaign?.status === 'SENT' &&
    typeof r.json?.campaign?.delivered === 'number'
      ? pass('admin_send', `delivered=${r.json.campaign.delivered}`)
      : fail('admin_send', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/admin/push/${cid}/send`, {
      token: tok,
      body: {},
    });
    r.status === 400
      ? pass('reject_double_send')
      : fail('reject_double_send', `status=${r.status}`);
  }

  {
    const r = await req('POST', '/api/v1/admin/push/bad id!!/send', {
      token: tok,
      body: {},
    });
    r.status === 400 || r.status === 404
      ? pass('reject_bad_campaign_id')
      : fail('reject_bad_campaign_id', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: cid,
        title: 'Should fail',
        body: 'locked',
        deepLink: 'ffops://home',
        audience: 'ALL',
        scheduleMode: 'draft',
      },
    });
    r.status === 400
      ? pass('reject_edit_sent')
      : fail('reject_edit_sent', `status=${r.status}`);
  }

  {
    const r = await req('DELETE', `/api/v1/admin/push/${cid}`, { token: tok });
    r.status === 400
      ? pass('reject_delete_sent')
      : fail('reject_delete_sent', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/push/inbox', { token: userTok });
    const ids = (r.json?.messages ?? []).map((m: any) => m.id);
    r.status === 200 && ids.includes(cid)
      ? pass('inbox_includes_sent')
      : fail('inbox_includes_sent', JSON.stringify(ids));
  }

  // Cleanup draft leftover
  const draftId = `e2e_push_clean_${Date.now().toString(36)}`;
  await req('PUT', '/api/v1/admin/push', {
    token: tok,
    body: {
      id: draftId,
      title: 'Cleanup',
      body: 'temp',
      deepLink: 'ffops://home',
      audience: 'ALL',
      scheduleMode: 'draft',
    },
  });
  {
    const r = await req('DELETE', `/api/v1/admin/push/${draftId}`, {
      token: tok,
    });
    okAuth(r.status) || r.status === 200
      ? pass('delete_draft_ok')
      : fail('delete_draft_ok', `status=${r.status}`);
  }

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
