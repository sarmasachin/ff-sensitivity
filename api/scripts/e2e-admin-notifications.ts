/**
 * Admin bell unread: dummy seed used to always reset to 3.
 * Live support unread must stay 0 after mark-all-read + reload.
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
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

function dummySeedUnread(): number {
  return [
    { read: false },
    { read: false },
    { read: false },
    { read: true },
    { read: true },
    { read: true },
  ].filter((n) => !n.read).length;
}

async function main() {
  loadEnv();

  dummySeedUnread() === 3
    ? pass('old_dummy_seed_was_always_3')
    : fail('old_dummy_seed_was_always_3');

  const stamp = Date.now().toString(36);
  const emails = [0, 1, 2].map((i) => `e2e.notif.${i}.${stamp}@example.com`);
  const users = [];
  for (let i = 0; i < emails.length; i++) {
    users.push(
      await prisma.user.create({
        data: {
          email: emails[i],
          displayName: `Notif ${i + 1}`,
          googleSub: `sub_notif_${stamp}_${i}`,
          lastLoginAt: new Date(),
        },
      }),
    );
  }

  let httpRan = false;
  try {
    const ping = await fetch(`${API}/api/v1/app/config`, {
      signal: AbortSignal.timeout(4000),
    });
    httpRan = ping.ok;
  } catch {
    httpRan = false;
  }

  if (!httpRan) {
    fail('api_up', 'local API not reachable');
  } else {
    const secret = process.env.JWT_ACCESS_SECRET;
    const userSecret = process.env.JWT_USER_SECRET;
    const adminEmail =
      process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
    const admin = await prisma.admin.findFirst({
      where: { email: adminEmail, isActive: true },
    });
    if (!admin || !secret || !userSecret) {
      fail('admin_jwt', 'missing admin or JWT secrets');
    } else {
      const adminTok = jwt.sign(
        { sub: admin.id, email: admin.email, role: admin.role },
        secret,
        { expiresIn: '15m' },
      );

      const threadIds: string[] = [];
      for (const user of users) {
        const userTok = jwt.sign(
          { sub: user.id, email: user.email, aud: 'user' },
          userSecret,
          { expiresIn: '1h' },
        );
        const started = await req('POST', '/api/v1/support/thread', {
          token: userTok,
          body: {
            name: user.displayName,
            email: user.email,
            subject: 'BUG',
            message: `Unread bell check ${user.displayName}`,
            appVersion: '1.0.3',
            deviceLabel: 'e2e device',
          },
        });
        const id = started.json?.id as string | undefined;
        started.status === 200 || started.status === 201
          ? pass(`open_thread_${user.displayName.replace(/\s/g, '_')}`)
          : fail(
              `open_thread_${user.displayName.replace(/\s/g, '_')}`,
              `status=${started.status}`,
            );
        if (id) threadIds.push(id);
      }

      const before = await req('GET', '/api/v1/admin/support/stats', {
        token: adminTok,
      });
      const unreadBefore = Number(before.json?.unread ?? -1);
      unreadBefore >= 3
        ? pass('stats_unread_at_least_3', `unread=${unreadBefore}`)
        : fail('stats_unread_at_least_3', JSON.stringify(before.json));

      const listBefore = await req('GET', '/api/v1/admin/support', {
        token: adminTok,
      });
      const oursBefore = (listBefore.json?.threads ?? []).filter((t: any) =>
        threadIds.includes(t.id),
      );
      oursBefore.length === 3 && oursBefore.every((t: any) => t.unread === true)
        ? pass('list_three_unread')
        : fail('list_three_unread', JSON.stringify(oursBefore));

      let markOk = 0;
      for (const id of threadIds) {
        const marked = await req('PATCH', `/api/v1/admin/support/${id}/read`, {
          token: adminTok,
        });
        if (
          (marked.status === 200 || marked.status === 201) &&
          marked.json?.unread === false
        ) {
          markOk += 1;
        }
      }
      markOk === 3
        ? pass('mark_all_three_read')
        : fail('mark_all_three_read', `ok=${markOk}`);

      const listAfter = await req('GET', '/api/v1/admin/support', {
        token: adminTok,
      });
      const oursAfter = (listAfter.json?.threads ?? []).filter((t: any) =>
        threadIds.includes(t.id),
      );
      oursAfter.length === 3 && oursAfter.every((t: any) => t.unread === false)
        ? pass('reload_stays_read_not_3_unread')
        : fail('reload_stays_read_not_3_unread', JSON.stringify(oursAfter));

      const after = await req('GET', '/api/v1/admin/support/stats', {
        token: adminTok,
      });
      const unreadAfter = Number(after.json?.unread ?? -1);
      unreadAfter === unreadBefore - 3
        ? pass('stats_unread_dropped_by_3', `${unreadBefore}→${unreadAfter}`)
        : fail(
            'stats_unread_dropped_by_3',
            `${unreadBefore}→${unreadAfter}`,
          );
    }
  }

  const userIds = users.map((u) => u.id);
  await prisma.supportMessage.deleteMany({
    where: { thread: { userId: { in: userIds } } },
  });
  await prisma.supportThread.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  const failed = checks.filter((x) => !x.ok).length;
  console.log(`\n${checks.filter((x) => x.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
