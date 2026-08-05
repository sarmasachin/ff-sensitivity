/**
 * Extra audit security cross-checks (beyond e2e:audit).
 */
import { PrismaClient, AdminRole, AdminModule } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

function loadEnv() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0_9_]+)=(.*)$/);
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
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const stamp = Date.now().toString(36);
  const cleanupEmails: string[] = [];
  const cleanupAuditIds: string[] = [];

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
  const meId = login.json?.admin?.id as string | undefined;

  {
    const r = await req('GET', '/api/v1/admin/audit?limit=abc', { token: tok });
    r.status === 400
      ? pass('reject_nan_limit')
      : fail('reject_nan_limit', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/audit?limit=-3', { token: tok });
    r.status === 400
      ? pass('reject_negative_limit')
      : fail('reject_negative_limit', `status=${r.status}`);
  }

  const catRows = await Promise.all([
    prisma.auditLog.create({
      data: {
        actorAdminId: meId ?? null,
        action: 'auth.login',
        entity: 'admin',
        afterJson: { ip: '203.0.113.10' },
      },
    }),
    prisma.auditLog.create({
      data: {
        actorAdminId: meId ?? null,
        action: 'staff:invite',
        entity: 'admin:x',
        afterJson: { email: 'invitee@example.com', role: 'VIEWER' },
      },
    }),
    prisma.auditLog.create({
      data: {
        actorAdminId: meId ?? null,
        action: 'wallets.grant',
        entity: 'wallet:u1',
        afterJson: { coins: 10 },
      },
    }),
    prisma.auditLog.create({
      data: {
        actorAdminId: meId ?? null,
        action: 'devices.note',
        entity: 'device:d1',
        afterJson: { note: 'ok' },
      },
    }),
    prisma.auditLog.create({
      data: {
        actorAdminId: meId ?? null,
        action: 'claims.approve',
        entity: 'claim:c1',
        afterJson: { ok: true },
      },
    }),
  ]);
  cleanupAuditIds.push(...catRows.map((r) => r.id));

  {
    const r = await req('GET', '/api/v1/admin/audit?limit=100', { token: tok });
    const byId = new Map<string, any>(
      (r.json?.events ?? []).map((e: any) => [e.id as string, e]),
    );
    const expect: Record<string, string> = {
      [catRows[0].id]: 'LOGIN',
      [catRows[1].id]: 'STAFF',
      [catRows[2].id]: 'WALLET',
      [catRows[3].id]: 'DEVICE',
      [catRows[4].id]: 'REDEEM',
    };
    let ok = true;
    for (const [id, cat] of Object.entries(expect)) {
      const hit = byId.get(id);
      if (!hit || hit.category !== cat) {
        ok = false;
        fail('category_map', `${id} expected ${cat} got ${hit?.category}`);
      }
    }
    if (ok) pass('category_map');

    const loginHit: any = byId.get(catRows[0].id);
    loginHit?.ipLabel === '203.0.113.10' && loginHit?.action === 'Session start'
      ? pass('login_ip_and_label')
      : fail(
          'login_ip_and_label',
          `ip=${loginHit?.ipLabel} action=${loginHit?.action}`,
        );

    const staffHit: any = byId.get(catRows[1].id);
    const detail = String(staffHit?.detail ?? '');
    detail.includes('in***@example.com')
      ? pass('detail_masks_email')
      : staffHit && !detail.includes('invitee@example.com')
        ? pass('detail_masks_email', 'email scrubbed')
        : fail('detail_masks_email', detail.slice(0, 160));
  }

  {
    const disabledEmail = `e2e.audit.disabled.${stamp}@example.com`;
    cleanupEmails.push(disabledEmail);
    const hash = await bcrypt.hash('AuditE2e!23456', 10);
    await prisma.admin.create({
      data: {
        email: disabledEmail,
        passwordHash: hash,
        role: AdminRole.VIEWER,
        allowedModules: [AdminModule.audit],
        isActive: false,
        mustChangePassword: false,
      },
    });
    const dLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: disabledEmail, password: 'AuditE2e!23456' },
    });
    dLogin.status === 401
      ? pass('disabled_cannot_login')
      : fail('disabled_cannot_login', `status=${dLogin.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/audit?limit=1', { token: tok });
    r.status === 200 && (r.json?.events?.length ?? 0) <= 1
      ? pass('limit_honored')
      : fail('limit_honored', `len=${r.json?.events?.length}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/audit', {
      token: tok,
      body: { events: [] },
    });
    r.status === 404 || r.status === 405
      ? pass('no_mutate_put')
      : fail('no_mutate_put', `status=${r.status}`);
  }

  {
    const phoneRow = await prisma.auditLog.create({
      data: {
        actorAdminId: meId ?? null,
        action: 'auth.profile_update',
        entity: 'admin',
        afterJson: {
          notifyEmail: 'desk@example.com',
          phone: '+919876543210',
          plainCode: 'LEAK-CODE-99',
          apiKey: 'sk_live_should_hide',
        },
      },
    });
    cleanupAuditIds.push(phoneRow.id);

    const r = await req('GET', '/api/v1/admin/audit?limit=50', { token: tok });
    const hit = (r.json?.events ?? []).find((e: any) => e.id === phoneRow.id);
    const detail = String(hit?.detail ?? '');
    const ok =
      hit &&
      !detail.includes('+919876543210') &&
      !detail.includes('LEAK-CODE-99') &&
      !detail.includes('sk_live_should_hide') &&
      !detail.includes('desk@example.com') &&
      detail.includes('[redacted]');
    ok
      ? pass('redact_phone_apikey_plaincode')
      : fail('redact_phone_apikey_plaincode', detail.slice(0, 180));
  }

  {
    const claimRow = await prisma.auditLog.create({
      data: {
        actorAdminId: meId ?? null,
        action: 'claims.delete',
        entity: 'redeem_claim:x',
        beforeJson: {
          userEmail: 'victim@example.com',
          title: 'Pack',
        },
        afterJson: { deleted: true },
      },
    });
    cleanupAuditIds.push(claimRow.id);
    const r = await req('GET', '/api/v1/admin/audit?limit=50', { token: tok });
    const hit = (r.json?.events ?? []).find((e: any) => e.id === claimRow.id);
    const detail = String(hit?.detail ?? '');
    !detail.includes('victim@example.com') && detail.includes('vi***@example.com')
      ? pass('mask_userEmail_alias')
      : fail('mask_userEmail_alias', detail.slice(0, 160));
  }

  await prisma.auditLog.deleteMany({
    where: { id: { in: cleanupAuditIds } },
  });
  await prisma.admin.deleteMany({ where: { email: { in: cleanupEmails } } });

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\n${checks.length - failed.length}/${checks.length} passed` +
      (failed.length ? ` · ${failed.length} failed` : ''),
  );
  await prisma.$disconnect();
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
