/**
 * Extra push security cross-checks (local Postgres).
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

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if (!okAuth(login.status) || !login.json?.accessToken) {
    fail('login', `status=${login.status}`);
    console.log(`\n0/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const tok = login.json.accessToken as string;
  pass('login');

  {
    const r = await req('PUT', '/api/v1/admin/push', {
      token: tok,
      body: {
        id: 'e2e_extra_js',
        title: 'JS link',
        body: 'body ok here',
        deepLink: 'javascript:alert(1)',
        audience: 'ALL',
        scheduleMode: 'draft',
      },
    });
    r.status === 400
      ? pass('reject_js_deeplink')
      : fail('reject_js_deeplink', `status=${r.status}`);
  }

  // Admin without push module
  const noModHash = await bcrypt.hash('NoModPass9', 12);
  await prisma.admin.upsert({
    where: { email: 'e2e.push.nomod@example.com' },
    update: {
      passwordHash: noModHash,
      role: 'SUB_ADMIN',
      allowedModules: ['promos'],
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.push.nomod@example.com',
      passwordHash: noModHash,
      role: 'SUB_ADMIN',
      allowedModules: ['promos'],
      isActive: true,
      mustChangePassword: false,
    },
  });
  const noModLogin = await req('POST', '/api/v1/auth/login', {
    body: { email: 'e2e.push.nomod@example.com', password: 'NoModPass9' },
  });
  if (okAuth(noModLogin.status) && noModLogin.json?.accessToken) {
    const r = await req('GET', '/api/v1/admin/push', {
      token: noModLogin.json.accessToken,
    });
    r.status === 403
      ? pass('module_guard_403')
      : fail('module_guard_403', `status=${r.status}`);
  } else {
    fail('module_guard_403', 'login failed');
  }

  // Inbox audience: TOPIC only if subscribed
  const topicId = `e2e_topic_${Date.now().toString(36)}`;
  const otherId = `e2e_other_${Date.now().toString(36)}`;
  await req('PUT', '/api/v1/admin/push', {
    token: tok,
    body: {
      id: topicId,
      title: 'Names topic',
      body: 'Only names topic devices',
      deepLink: 'ffops://names',
      audience: 'TOPIC',
      topic: 'feature_names',
      scheduleMode: 'draft',
    },
  });
  await req('PUT', '/api/v1/admin/push', {
    token: tok,
    body: {
      id: otherId,
      title: 'Other topic',
      body: 'Should not appear',
      deepLink: 'ffops://home',
      audience: 'TOPIC',
      topic: 'secret_ops_only',
      scheduleMode: 'draft',
    },
  });
  await req('POST', `/api/v1/admin/push/${topicId}/send`, {
    token: tok,
    body: {},
  });
  await req('POST', `/api/v1/admin/push/${otherId}/send`, {
    token: tok,
    body: {},
  });

  const appUser = await prisma.user.upsert({
    where: { email: 'e2e.push.extra@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-push-extra',
      email: 'e2e.push.extra@example.com',
      displayName: 'Push Extra',
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: appUser.id, email: appUser.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
  await req('POST', '/api/v1/push/device', {
    token: userTok,
    body: {
      token: `android_extra_${Date.now()}`,
      topics: ['feature_names'],
    },
  });
  {
    const r = await req('GET', '/api/v1/push/inbox', { token: userTok });
    const ids = (r.json?.messages ?? []).map((m: any) => m.id);
    ids.includes(topicId) && !ids.includes(otherId)
      ? pass('inbox_filters_topic_audience')
      : fail('inbox_filters_topic_audience', JSON.stringify(ids));
  }

  {
    const r = await req('POST', '/api/v1/push/device', {
      token: userTok,
      body: { token: 'short' },
    });
    r.status === 400
      ? pass('reject_short_device_token')
      : fail('reject_short_device_token', `status=${r.status}`);
  }

  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(checks.some((c) => !c.ok) ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
