/**
 * Extra support security cross-checks (local).
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

const checks: { name: string; ok: boolean; detail?: string }[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
  console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
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
  const user = await prisma.user.upsert({
    where: { email: 'e2e.support.verify@example.com' },
    update: { isActive: true, displayName: 'Verify User' },
    create: {
      googleSub: 'e2e-support-verify',
      email: 'e2e.support.verify@example.com',
      displayName: 'Verify User',
      isActive: true,
    },
  });
  await prisma.supportMessage.deleteMany({
    where: { thread: { userId: user.id } },
  });
  await prisma.supportThread.deleteMany({ where: { userId: user.id } });

  const tok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  let r = await req('POST', '/api/v1/support/thread', {
    token: tok,
    body: {
      name: 'V',
      email: user.email,
      subject: 'HACK',
      message: 'hi',
      appVersion: '1',
      deviceLabel: 'd',
    },
  });
  r.status === 400 ? pass('bad_subject') : fail('bad_subject', String(r.status));

  r = await req('POST', '/api/v1/support/thread', {
    token: tok,
    body: {
      name: 'V',
      email: user.email,
      subject: 'BUG',
      message: 'x'.repeat(1001),
      appVersion: '1',
      deviceLabel: 'd',
    },
  });
  r.status === 400
    ? pass('oversize_msg')
    : fail('oversize_msg', String(r.status));

  r = await req('POST', '/api/v1/support/thread', {
    token: tok,
    body: {
      name: 'V',
      email: user.email,
      subject: 'BUG',
      message: '\u200b\u200b',
      appVersion: '1',
      deviceLabel: 'd',
    },
  });
  r.status === 400 ? pass('zwsp_empty') : fail('zwsp_empty', String(r.status));

  // Email spoof attempt — should be forced to account email after harden
  r = await req('POST', '/api/v1/support/thread', {
    token: tok,
    body: {
      name: 'Imposter',
      email: 'victim@other.com',
      subject: 'BUG',
      message: 'spoof check ticket body',
      appVersion: '1',
      deviceLabel: 'Pixel',
    },
  });
  const spoofOk =
    (r.status === 200 || r.status === 201) &&
    r.json?.email === user.email &&
    r.json?.name === user.displayName;
  spoofOk
    ? pass('email_name_bound_to_account', r.json?.email)
    : fail(
        'email_name_bound_to_account',
        `status=${r.status} email=${r.json?.email} name=${r.json?.name}`,
      );
  const tid = r.json?.id as string;

  const login = await req('POST', '/api/v1/auth/login', {
    body: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      password: process.env.SUPERADMIN_PASSWORD ?? '123456',
    },
  });
  const at = login.json?.accessToken as string;

  r = await req('POST', `/api/v1/admin/support/${tid}/reply`, {
    token: at,
    body: { message: '<script>x</script>' },
  });
  r.status === 400
    ? pass('admin_script_block')
    : fail('admin_script_block', String(r.status));

  r = await req('POST', '/api/v1/support/thread/../x/messages', {
    token: tok,
    body: { message: 'x' },
  });
  r.status === 400 || r.status === 404
    ? pass('path_traversal', String(r.status))
    : fail('path_traversal', String(r.status));

  await req('PATCH', `/api/v1/admin/support/${tid}/close`, { token: at });
  r = await req('POST', '/api/v1/support/thread', {
    token: tok,
    body: {
      name: 'ignored',
      email: 'ignored@x.com',
      subject: 'FEEDBACK',
      message: 'new after close',
      appVersion: '1',
      deviceLabel: 'd',
    },
  });
  r.status === 200 || r.status === 201
    ? pass('restart_after_close')
    : fail('restart_after_close', String(r.status));

  // Closed thread must not appear as "mine"
  r = await req('GET', '/api/v1/support/thread', { token: tok });
  r.status === 200 && r.json?.thread?.status !== 'CLOSED'
    ? pass('mine_excludes_closed')
    : fail('mine_excludes_closed', JSON.stringify(r.json?.thread?.status));

  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(ok === checks.length ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
