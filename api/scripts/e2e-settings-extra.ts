/**
 * Extra settings security cross-checks (beyond e2e:settings).
 */
import { PrismaClient } from '@prisma/client';
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
  const tok = login.json?.accessToken as string | undefined;
  if (!tok) {
    fail('admin_login');
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('admin_login');

  const get = await req('GET', '/api/v1/admin/settings', { token: tok });
  const baseline = get.json;
  if (!baseline?.session) {
    fail('load_baseline');
    await prisma.$disconnect();
    process.exit(1);
  }

  {
    const r = await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: baseline.preferences,
        session: { ...baseline.session, absoluteSessionHours: 999 },
        security: baseline.security,
      },
    });
    r.status === 400
      ? pass('reject_session_too_long')
      : fail('reject_session_too_long', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: baseline.preferences,
        session: { ...baseline.session, rememberDeviceDays: -1 },
        security: baseline.security,
      },
    });
    r.status === 400
      ? pass('reject_remember_negative')
      : fail('reject_remember_negative', `status=${r.status}`);
  }

  {
    const r = await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: baseline.preferences,
        session: baseline.session,
        security: {
          ...baseline.security,
          ipAllowlistNote: 'javascript:alert(1)',
        },
      },
    });
    r.status === 400
      ? pass('reject_js_ip_note')
      : fail('reject_js_ip_note', `status=${r.status}`);
  }

  // single-session: create two sessions then login should leave one when flag on
  {
    await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: baseline.preferences,
        session: { ...baseline.session, singleSessionOnly: true },
        security: baseline.security,
      },
    });
    const admin = await prisma.admin.findUnique({
      where: { email: adminEmail },
    });
    if (!admin) {
      fail('single_session_admin');
    } else {
      await prisma.adminSession.create({
        data: {
          adminId: admin.id,
          refreshTokenHash: `e2e-old-${Date.now()}`,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });
      const before = await prisma.adminSession.count({
        where: { adminId: admin.id },
      });
      await req('POST', '/api/v1/auth/login', {
        body: { email: adminEmail, password: adminPassword },
      });
      const after = await prisma.adminSession.count({
        where: { adminId: admin.id },
      });
      before >= 2 && after === 1
        ? pass('single_session_revokes_others', `before=${before} after=${after}`)
        : fail(
            'single_session_revokes_others',
            `before=${before} after=${after}`,
          );
    }
  }

  // wallet reauth gate
  {
    await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: baseline.preferences,
        session: baseline.session,
        security: {
          ...baseline.security,
          requireReauthForWalletAdjust: true,
          requireReauthForReveal: true,
          requireReauthForStaffInvite: true,
        },
      },
    });
    const user = await prisma.user.findFirst({
      select: { id: true },
    });
    if (!user) {
      pass('wallet_reauth_skip_no_user');
    } else {
      const relog = await req('POST', '/api/v1/auth/login', {
        body: { email: adminEmail, password: adminPassword },
      });
      const t2 = relog.json?.accessToken as string;
      const denied = await req(
        'POST',
        `/api/v1/admin/wallets/${user.id}/grant`,
        {
          token: t2,
          body: {
            amount: 1,
            reason: 'e2e settings reauth',
            requestId: `e2e-set-${Date.now()}`,
          },
        },
      );
      denied.status === 403
        ? pass('wallet_grant_requires_reauth')
        : fail('wallet_grant_requires_reauth', `status=${denied.status}`);

      const badPwd = await req(
        'POST',
        `/api/v1/admin/wallets/${user.id}/grant`,
        {
          token: t2,
          body: {
            amount: 1,
            reason: 'e2e settings bad pwd',
            requestId: `e2e-bad-${Date.now()}`,
            currentPassword: 'definitely-wrong-password',
          },
        },
      );
      badPwd.status === 403
        ? pass('wallet_grant_rejects_bad_password')
        : fail('wallet_grant_rejects_bad_password', `status=${badPwd.status}`);
    }
  }

  // claim reveal step-up
  {
    const claim = await prisma.redeemClaim.findFirst({
      select: { id: true },
    });
    if (!claim) {
      pass('reveal_reauth_skip_no_claim');
    } else {
      const relog = await req('POST', '/api/v1/auth/login', {
        body: { email: adminEmail, password: adminPassword },
      });
      const t3 = relog.json?.accessToken as string;
      const denied = await req(
        'POST',
        `/api/v1/admin/claims/${claim.id}/reveal`,
        { token: t3, body: {} },
      );
      denied.status === 403
        ? pass('claim_reveal_requires_reauth')
        : fail('claim_reveal_requires_reauth', `status=${denied.status}`);

      const okReveal = await req(
        'POST',
        `/api/v1/admin/claims/${claim.id}/reveal`,
        {
          token: t3,
          body: { currentPassword: adminPassword },
        },
      );
      okReveal.status === 200 && typeof okReveal.json?.code === 'string'
        ? pass('claim_reveal_with_reauth')
        : fail(
            'claim_reveal_with_reauth',
            `status=${okReveal.status} code=${okReveal.json?.code}`,
          );
    }
  }

  {
    const r = await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        preferences: baseline.preferences,
        session: baseline.session,
        security: {
          ...baseline.security,
          auditRetentionDays: 3,
        },
      },
    });
    r.status === 400
      ? pass('reject_retention_too_low')
      : fail('reject_retention_too_low', `status=${r.status}`);
  }

  // Always leave reauth gates off so sibling suites (wallets/staff) stay stable.
  const clean = {
    preferences: baseline.preferences,
    session: baseline.session,
    security: {
      ...baseline.security,
      requireReauthForReveal: false,
      requireReauthForStaffInvite: false,
      requireReauthForWalletAdjust: false,
      auditRetentionDays: baseline.security?.auditRetentionDays ?? 90,
      auditAutoPurge: baseline.security?.auditAutoPurge ?? true,
    },
  };
  await req('PUT', '/api/v1/admin/settings', {
    token: tok,
    body: clean,
  });

  // Retention purge: old row deleted, recent kept
  {
    await req('PUT', '/api/v1/admin/settings', {
      token: tok,
      body: {
        ...clean,
        security: {
          ...clean.security,
          auditRetentionDays: 7,
          auditAutoPurge: true,
        },
      },
    });
    const old = await prisma.auditLog.create({
      data: {
        action: 'e2e.old_event',
        entity: 'e2e',
        createdAt: new Date(Date.now() - 20 * 86_400_000),
        afterJson: { probe: true },
      },
    });
    const fresh = await prisma.auditLog.create({
      data: {
        action: 'e2e.fresh_event',
        entity: 'e2e',
        afterJson: { probe: true },
      },
    });
    const purge = await req('POST', '/api/v1/admin/settings/audit-purge', {
      token: tok,
      body: {},
    });
    const oldGone = !(await prisma.auditLog.findUnique({ where: { id: old.id } }));
    const freshOk = !!(await prisma.auditLog.findUnique({
      where: { id: fresh.id },
    }));
    purge.status >= 200 &&
    purge.status < 300 &&
    purge.json?.deleted >= 1 &&
    oldGone &&
    freshOk
      ? pass('audit_purge_keeps_recent', `deleted=${purge.json.deleted}`)
      : fail(
          'audit_purge_keeps_recent',
          `status=${purge.status} oldGone=${oldGone} freshOk=${freshOk}`,
        );
    await prisma.auditLog.deleteMany({
      where: { id: { in: [fresh.id] } },
    });
  }

  await req('PUT', '/api/v1/admin/settings', {
    token: tok,
    body: clean,
  });

  // Hard-reset reauth in DB so wallets/staff e2e cannot inherit sticky flags.
  {
    const row = await prisma.opsSettings.findUnique({ where: { id: 1 } });
    if (row && row.security && typeof row.security === 'object') {
      const sec = { ...(row.security as Record<string, unknown>) };
      sec.requireReauthForReveal = false;
      sec.requireReauthForStaffInvite = false;
      sec.requireReauthForWalletAdjust = false;
      sec.auditRetentionDays = 90;
      sec.auditAutoPurge = true;
      await prisma.opsSettings.update({
        where: { id: 1 },
        data: { security: sec as object },
      });
    }
  }

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
