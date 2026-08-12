/**
 * Deep redeem live audit: ACL, leaks, catalog sync, pause/stock, audit, leftovers.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const ROOT = path.join(__dirname, '..', '..');

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

type Check = { name: string; ok: boolean };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false });
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
    json = { raw: text.slice(0, 160) };
  }
  return { status: res.status, json };
}

function signAdmin(admin: { id: string; email: string; role: string }) {
  return jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '15m' },
  );
}

function lineCount(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/).length;
}

function leakScan(obj: unknown, secret: string): string[] {
  const hits: string[] = [];
  const walk = (v: unknown, p: string) => {
    if (typeof v === 'string') {
      if (v.includes(secret)) hits.push(p);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x, i) => walk(x, `${p}[${i}]`));
      return;
    }
    if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) walk(val, `${p}.${k}`);
    }
  };
  walk(obj, 'root');
  return hits;
}

async function main() {
  loadEnv();
  const stamp = Date.now().toString();
  const secret = `XCHECK${stamp}SECRET01`;
  const secret2 = `XCHECK${stamp}SECRET02`;

  const superAdmin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (!superAdmin || !process.env.JWT_ACCESS_SECRET || !process.env.JWT_USER_SECRET) {
    fail('admin_jwt');
    process.exit(1);
  }
  const adminTok = signAdmin(superAdmin);

  const unauth = await req('GET', '/api/v1/admin/redeem');
  unauth.status === 401
    ? pass('list_requires_auth')
    : fail('list_requires_auth', `status=${unauth.status}`);

  const viewer = await prisma.admin.create({
    data: {
      email: `e2e.redeem.viewer.${stamp}@example.com`,
      passwordHash: superAdmin.passwordHash,
      role: 'VIEWER',
      allowedModules: ['redeem'],
      isActive: true,
    },
  });
  const noMod = await prisma.admin.create({
    data: {
      email: `e2e.redeem.nomod.${stamp}@example.com`,
      passwordHash: superAdmin.passwordHash,
      role: 'ADMIN',
      allowedModules: [],
      isActive: true,
    },
  });
  const viewerTok = signAdmin(viewer);
  const noModTok = signAdmin(noMod);

  const noModList = await req('GET', '/api/v1/admin/redeem', { token: noModTok });
  noModList.status === 403
    ? pass('staff_without_module_forbidden')
    : fail('staff_without_module_forbidden', `status=${noModList.status}`);

  const viewerList = await req('GET', '/api/v1/admin/redeem', {
    token: viewerTok,
  });
  viewerList.status === 200
    ? pass('viewer_can_list')
    : fail('viewer_can_list', `status=${viewerList.status}`);

  const body = {
    title: 'Crosscheck Card',
    type: 'FF_DIAMONDS',
    valueLabel: '100',
    codeSecret: secret,
    status: 'ACTIVE',
    cadence: 'WEEKLY',
    stockLeft: 1,
    coinCost: null,
    expiresLabel: 'This week',
    tip: 'Live check',
    redeemUrl: 'https://play.google.com/redeem',
  };
  const viewerCreate = await req('POST', '/api/v1/admin/redeem', {
    token: viewerTok,
    body,
  });
  viewerCreate.status === 403
    ? pass('viewer_cannot_create')
    : fail('viewer_cannot_create', `status=${viewerCreate.status}`);

  const extra = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: { ...body, extraField: 'nope' },
  });
  extra.status === 400
    ? pass('forbid_unknown_fields')
    : fail('forbid_unknown_fields', `status=${extra.status}`);

  const created = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body,
  });
  const id = created.json?.id as string | undefined;
  (created.status === 200 || created.status === 201) && id
    ? pass('create_weekly_diamonds')
    : fail(
        'create_weekly_diamonds',
        `status=${created.status} ${JSON.stringify(created.json)}`,
      );

  const leaks = leakScan(created.json, secret);
  leaks.length === 0 && created.json?.codeSecret === ''
    ? pass('create_response_masks_secret')
    : fail('create_response_masks_secret', leaks.join(','));

  const listed = await req('GET', '/api/v1/admin/redeem', { token: adminTok });
  const listLeaks = leakScan(listed.json, secret);
  listLeaks.length === 0
    ? pass('list_never_leaks_secret')
    : fail('list_never_leaks_secret', listLeaks.join(','));

  const dup = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: { ...body, title: 'Dup', codeSecret: secret },
  });
  dup.status === 409
    ? pass('duplicate_secret_conflict')
    : fail('duplicate_secret_conflict', `status=${dup.status}`);

  const missing = await req('PATCH', '/api/v1/admin/redeem/not-a-real-id-xxx', {
    token: adminTok,
    body: { title: 'x' },
  });
  missing.status === 400 || missing.status === 404
    ? pass('bad_id_rejected')
    : fail('bad_id_rejected', `status=${missing.status}`);

  const patched = await req('PATCH', `/api/v1/admin/redeem/${id}`, {
    token: adminTok,
    body: { title: 'Crosscheck Renamed' },
  });
  patched.status === 200 && patched.json?.title === 'Crosscheck Renamed'
    ? pass('update_title')
    : fail('update_title', JSON.stringify(patched.json));

  const viewerReveal = await req('POST', `/api/v1/admin/redeem/${id}/reveal`, {
    token: viewerTok,
    body: {},
  });
  viewerReveal.status === 403
    ? pass('viewer_cannot_reveal')
    : fail('viewer_cannot_reveal', `status=${viewerReveal.status}`);

  const user = await prisma.user.create({
    data: {
      email: `e2e.redeem.xc.${stamp}@example.com`,
      displayName: 'XC',
      googleSub: `sub_redeem_xc_${stamp}`,
      coins: 0,
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET,
    { expiresIn: '1h' },
  );

  const catalog = await req('GET', '/api/v1/redeem/catalog', { token: userTok });
  const hit = (catalog.json?.items ?? []).find((i: any) => i.id === id);
  catalog.status === 200 &&
  hit?.title === 'Crosscheck Renamed' &&
  hit.code == null &&
  hit.cadence === 'WEEKLY'
    ? pass('catalog_sees_updated_title')
    : fail('catalog_sees_updated_title', JSON.stringify(hit));

  const paused = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: { ...body, title: 'Paused XC', codeSecret: secret2, status: 'PAUSED' },
  });
  const pausedId = paused.json?.id as string | undefined;
  const pauseClaim = await req('POST', `/api/v1/redeem/${pausedId}/claim`, {
    token: userTok,
  });
  pauseClaim.status === 409
    ? pass('paused_claim_blocked')
    : fail('paused_claim_blocked', `status=${pauseClaim.status}`);

  const empty = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      ...body,
      title: 'Empty XC',
      codeSecret: `XCHECK${stamp}EMPTY00`,
      stockLeft: 0,
    },
  });
  const emptyId = empty.json?.id as string | undefined;
  const emptyClaim = await req('POST', `/api/v1/redeem/${emptyId}/claim`, {
    token: userTok,
  });
  emptyClaim.status === 409
    ? pass('stock_zero_claim_blocked')
    : fail('stock_zero_claim_blocked', `status=${emptyClaim.status}`);

  const claim = await req('POST', `/api/v1/redeem/${id}/claim`, {
    token: userTok,
  });
  (claim.status === 200 || claim.status === 201) && claim.json?.code === secret
    ? pass('claim_active_weekly')
    : fail(
        'claim_active_weekly',
        `status=${claim.status} ${JSON.stringify(claim.json)}`,
      );

  const after = await req('GET', '/api/v1/redeem/catalog', { token: userTok });
  const claimed = (after.json?.items ?? []).find((i: any) => i.id === id);
  claimed?.unlocked === true && claimed?.code === secret
    ? pass('catalog_after_claim_unlocks')
    : fail('catalog_after_claim_unlocks', JSON.stringify(claimed));

  const audits = id
    ? await prisma.auditLog.findMany({
        where: { entity: `redeem_code:${id}` },
        select: { action: true },
      })
    : [];
  const actions = new Set(audits.map((a) => a.action));
  actions.has('redeem.create') &&
  actions.has('redeem.update') &&
  actions.has('redeem.reveal') === false
    ? pass('audit_create_update_present', [...actions].join(','))
    : actions.has('redeem.create') && actions.has('redeem.update')
      ? pass('audit_create_update_present', [...actions].join(','))
      : fail('audit_create_update_present', [...actions].join(','));

  // reveal was viewer-blocked; do a real reveal for audit
  await req('POST', `/api/v1/admin/redeem/${id}/reveal`, {
    token: adminTok,
    body: {},
  });
  const audits2 = id
    ? await prisma.auditLog.findMany({
        where: { entity: `redeem_code:${id}` },
        select: { action: true },
      })
    : [];
  audits2.some((a) => a.action === 'redeem.reveal')
    ? pass('audit_reveal_present')
    : fail('audit_reveal_present');

  for (const rid of [id, pausedId, emptyId]) {
    if (rid) await req('DELETE', `/api/v1/admin/redeem/${rid}`, { token: adminTok });
  }
  const gone = await req('GET', '/api/v1/redeem/catalog', { token: userTok });
  const still = (gone.json?.items ?? []).some((i: any) => i.id === id);
  !still ? pass('delete_removed_from_catalog') : fail('delete_removed_from_catalog');

  const files = [
    'api/src/redeem/redeem-admin.service.ts',
    'api/src/redeem/redeem-admin.controller.ts',
    'api/src/redeem/redeem-admin.security.ts',
    'api/src/redeem/dto/redeem-admin.dto.ts',
    'api/src/redeem/redeem-module.guard.ts',
    'admin/src/app/(ops)/redeem/page.tsx',
    'admin/src/components/redeem/redeem-api.ts',
    'admin/src/components/redeem/redeem-data.ts',
    'admin/src/components/redeem/RedeemFormModal.tsx',
  ];
  const fat = files.filter((f) => lineCount(f) > 400);
  fat.length === 0
    ? pass('new_files_under_400_lines')
    : fail('new_files_under_400_lines', fat.join(','));

  const seed = fs.readFileSync(
    path.join(ROOT, 'api/prisma/seed.ts'),
    'utf8',
  );
  !seed.includes('redeemCode.createMany') &&
  !seed.includes('prisma.redeemCode.create(')
    ? pass('seed_does_not_insert_redeem')
    : fail('seed_does_not_insert_redeem');

  const leftover = await prisma.redeemCode.findMany({
    where: {
      OR: [
        { title: { in: ['Crosscheck Card', 'Crosscheck Renamed', 'Paused XC', 'Empty XC', 'Live E2E Card'] } },
        { codeSecret: { startsWith: 'XCHECK' } },
        { codeSecret: { startsWith: 'LIVEE2E' } },
      ],
    },
    select: { id: true, title: true },
  });
  leftover.length === 0
    ? pass('no_leftover_e2e_rows')
    : fail('no_leftover_e2e_rows', leftover.map((r) => r.title).join(','));

  await prisma.redeemClaim.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.admin.deleteMany({
    where: { id: { in: [viewer.id, noMod.id] } },
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
