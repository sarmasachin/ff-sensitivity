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

  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminRow = await prisma.admin.findFirst({
    where: {
      email: adminEmail.trim().toLowerCase(),
      isActive: true,
    },
  });
  const at = adminRow
    ? jwt.sign(
        { sub: adminRow.id, email: adminRow.email, role: adminRow.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '1h' },
      )
    : undefined;
  if (!at) {
    fail('admin_login', 'active admin not found');
    console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }

  r = await req('POST', `/api/v1/admin/support/${tid}/reply`, {
    token: at,
    body: { message: '   ' },
  });
  r.status === 400
    ? pass('admin_empty_reply')
    : fail('admin_empty_reply', String(r.status));

  r = await req('POST', `/api/v1/admin/support/${'x'.repeat(80)}/reply`, {
    token: at,
    body: { message: 'x' },
  });
  r.status === 400
    ? pass('admin_bad_id')
    : fail('admin_bad_id', String(r.status));

  r = await req('PATCH', '/api/v1/admin/support/missingthreadid000/close', {
    token: at,
  });
  r.status === 404
    ? pass('admin_close_not_found')
    : fail('admin_close_not_found', String(r.status));

  const listed = await req('GET', '/api/v1/admin/support?status=open', {
    token: at,
  });
  const openHit = (listed.json?.threads ?? []).some((t: any) => t.id === tid);
  const ack = (listed.json?.threads ?? [])
    .find((t: any) => t.id === tid)
    ?.messages?.find((m: any) => m.sender === 'ADMIN');
  listed.status === 200 && openHit
    ? pass('admin_open_status_filter')
    : fail('admin_open_status_filter', `hit=${openHit}`);

  if (!ack?.id) {
    fail('admin_delete_staff_message_forbidden', 'no admin ack');
  } else {
    r = await req(
      'DELETE',
      `/api/v1/admin/support/${tid}/messages/${ack.id}`,
      { token: at },
    );
    r.status === 403
      ? pass('admin_delete_staff_message_forbidden')
      : fail('admin_delete_staff_message_forbidden', String(r.status));
  }

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
  r = await req('POST', `/api/v1/admin/support/${tid}/reply`, {
    token: at,
    body: { message: 'Should fail on closed' },
  });
  r.status === 409
    ? pass('admin_reply_closed')
    : fail('admin_reply_closed', String(r.status));

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
