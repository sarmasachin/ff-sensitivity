/**
 * Audit admin list / ACL / redaction e2e (local Postgres).
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
  const stamp = Date.now().toString(36);
  const cleanupEmails: string[] = [];
  const cleanupAuditIds: string[] = [];

  {
    const r = await req('GET', '/api/v1/admin/audit');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }

  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  if (!okAuth(login.status) || !login.json?.accessToken) {
    fail('admin_login');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');
  const tok = login.json.accessToken as string;
  const meId = login.json?.admin?.id as string | undefined;

  {
    const r = await req('GET', '/api/v1/admin/audit', { token: tok });
    r.status === 200 && Array.isArray(r.json?.events)
      ? pass('admin_list', `count=${r.json.events.length}`)
      : fail('admin_list', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/audit?limit=0', { token: tok });
    r.status === 400
      ? pass('reject_bad_limit')
      : fail('reject_bad_limit', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/audit?limit=9999', { token: tok });
    r.status === 400
      ? pass('reject_limit_too_high')
      : fail('reject_limit_too_high', `status=${r.status}`);
  }

  for (const method of ['POST', 'PATCH', 'DELETE'] as const) {
    const r = await req(method, '/api/v1/admin/audit', {
      token: tok,
      body: {},
    });
    r.status === 404 || r.status === 405
      ? pass(`no_mutate_${method.toLowerCase()}`)
      : fail(`no_mutate_${method.toLowerCase()}`, `status=${r.status}`);
  }

  const secretRow = await prisma.auditLog.create({
    data: {
      actorAdminId: meId ?? null,
      action: 'e2e.secret_probe',
      entity: 'e2e:audit',
      afterJson: {
        password: 'SuperSecret123!',
        temporaryPassword: 'Tmp-leak',
        email: 'probe@example.com',
        token: 'jwt-should-hide',
        ok: true,
      },
    },
  });
  cleanupAuditIds.push(secretRow.id);

  {
    const r = await req('GET', '/api/v1/admin/audit?limit=50', { token: tok });
    const hit = (r.json?.events ?? []).find((e: any) => e.id === secretRow.id);
    if (!hit) {
      fail('redaction_row_present');
    } else {
      const detail = String(hit.detail ?? '');
      const emailOk =
        typeof hit.actorEmail === 'string' &&
        (hit.actorEmail.includes('***') || hit.actorEmail === 'system@ffops');
      const noLeak =
        !detail.includes('SuperSecret123!') &&
        !detail.includes('Tmp-leak') &&
        !detail.includes('jwt-should-hide') &&
        detail.includes('[redacted]');
      emailOk && noLeak
        ? pass('redact_secrets_and_mask_email')
        : fail(
            'redact_secrets_and_mask_email',
            `email=${hit.actorEmail} detail=${detail.slice(0, 120)}`,
          );
    }
  }

  const deniedEmail = `e2e.audit.denied.${stamp}@example.com`;
  const allowedEmail = `e2e.audit.ok.${stamp}@example.com`;
  cleanupEmails.push(deniedEmail, allowedEmail);
  const hash = await bcrypt.hash('AuditE2e!23456', 10);

  await prisma.admin.create({
    data: {
      email: deniedEmail,
      passwordHash: hash,
      role: AdminRole.VIEWER,
      allowedModules: [AdminModule.support],
      isActive: true,
      mustChangePassword: false,
      displayName: 'Audit Denied',
    },
  });
  await prisma.admin.create({
    data: {
      email: allowedEmail,
      passwordHash: hash,
      role: AdminRole.VIEWER,
      allowedModules: [AdminModule.audit],
      isActive: true,
      mustChangePassword: false,
      displayName: 'Audit Allowed',
    },
  });

  {
    const dLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: deniedEmail, password: 'AuditE2e!23456' },
    });
    const dTok = dLogin.json?.accessToken as string | undefined;
    if (!dTok) {
      fail('denied_viewer_login');
    } else {
      const r = await req('GET', '/api/v1/admin/audit', { token: dTok });
      r.status === 403
        ? pass('module_guard_denies_without_audit')
        : fail('module_guard_denies_without_audit', `status=${r.status}`);
    }
  }

  {
    const aLogin = await req('POST', '/api/v1/auth/login', {
      body: { email: allowedEmail, password: 'AuditE2e!23456' },
    });
    const aTok = aLogin.json?.accessToken as string | undefined;
    if (!aTok) {
      fail('allowed_viewer_login');
    } else {
      const r = await req('GET', '/api/v1/admin/audit', { token: aTok });
      r.status === 200 && Array.isArray(r.json?.events)
        ? pass('module_guard_allows_with_audit')
        : fail('module_guard_allows_with_audit', `status=${r.status}`);
    }
  }

  {
    const r = await req('GET', '/api/v1/admin/audit?limit=5', { token: tok });
    const events = r.json?.events ?? [];
    const shapeOk =
      events.length === 0 ||
      (typeof events[0].id === 'string' &&
        typeof events[0].action === 'string' &&
        typeof events[0].category === 'string' &&
        typeof events[0].result === 'string');
    r.status === 200 && shapeOk
      ? pass('row_shape_ok')
      : fail('row_shape_ok', `status=${r.status}`);
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
