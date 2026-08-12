/**
 * Redeem live wire audit: admin CRUD + app catalog share Postgres.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();
const ROOT = path.join(__dirname, '..', '..');

const DEMO_SECRETS = [
  'ABCD-8X92-K12M-99PL',
  'ABCD-8X92-K12M-99P2',
  'FFDX-7K21-P90Q-44MZ',
  'USED-0000-0000-0001',
  'WEEK-9K21-M88P-12QT',
  'LOWX-7K21-P90Q-0001',
  'HOLD-9K21-M88P-55ZX',
];

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

function readRepo(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
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
    json = { raw: text.slice(0, 180) };
  }
  return { status: res.status, json };
}

function looksMasked(code: unknown): boolean {
  if (typeof code !== 'string') return true;
  const c = code.trim();
  return !c || c.includes('•') || c.includes('****') || c.includes('…');
}

async function main() {
  loadEnv();

  const redeemPage = readRepo('admin/src/app/(ops)/redeem/page.tsx');
  !redeemPage.includes('REDEEM_DEMO_ROWS') &&
  redeemPage.includes('fetchRedeemCodes')
    ? pass('admin_page_loads_live_api')
    : fail('admin_page_loads_live_api');

  const header = readRepo(
    'admin/src/components/redeem/RedeemHeader.tsx',
  );
  !header.toLowerCase().includes('csv')
    ? pass('admin_csv_import_removed')
    : fail('admin_csv_import_removed');

  redeemPage.includes('createRedeemCode') &&
  redeemPage.includes('updateRedeemCode') &&
  redeemPage.includes('deleteRedeemCode')
    ? pass('admin_mutations_hit_api')
    : fail('admin_mutations_hit_api');

  const commentsDrawer = readRepo(
    'admin/src/components/redeem/RedeemCommentsDrawer.tsx',
  );
  !commentsDrawer.includes('REDEEM_COMMENT_DEMO') &&
  commentsDrawer.includes('No server comments yet')
    ? pass('admin_comments_not_demo')
    : fail('admin_comments_not_demo');

  const formModal = readRepo(
    'admin/src/components/redeem/RedeemFormModal.tsx',
  );
  const revealModal = readRepo(
    'admin/src/components/redeem/RedeemRevealModal.tsx',
  );
  !formModal.includes('Local draft until Redeem API is connected') &&
  !revealModal.includes('Local reveal only')
    ? pass('admin_modals_not_local_draft_copy')
    : fail('admin_modals_not_local_draft_copy');

  const claimLog = readRepo(
    'admin/src/components/redeem/RedeemClaimLogDrawer.tsx',
  );
  claimLog.includes('fetchClaims')
    ? pass('admin_claim_log_is_live_claims_api')
    : fail('admin_claim_log_is_live_claims_api');

  const appScreen = readRepo(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemScreen.kt',
  );
  appScreen.includes('RedeemRepository.loadCatalog') &&
  !appScreen.includes('sampleRedeemCodes')
    ? pass('app_screen_loads_live_catalog')
    : fail('app_screen_loads_live_catalog');

  const sample = readRepo(
    'app/src/main/java/com/ffsensitivity/app/data/RedeemModels.kt',
  );
  const sampleUsedElsewhere =
    readRepo(
      'app/src/main/java/com/ffsensitivity/app/data/RedeemCatalogCache.kt',
    ).includes('sampleRedeemCodes(') ||
    appScreen.includes('sampleRedeemCodes');
  !sample.includes('val sampleRedeemCodes') && !sampleUsedElsewhere
    ? pass('app_sampleRedeemCodes_removed')
    : fail('app_sampleRedeemCodes_removed');

  const seedCodes = await prisma.redeemCode.findMany({
    where: { codeSecret: { in: DEMO_SECRETS } },
    select: { id: true, title: true, codeSecret: true, status: true },
  });
  pass(
    'db_seed_dummy_codes',
    seedCodes.length
      ? `${seedCodes.length} still in DB: ${seedCodes.map((c) => c.codeSecret).join(', ')}`
      : 'none of the known dummy secrets in DB',
  );

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
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }

  const adminEmail =
    process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const admin = await prisma.admin.findFirst({
    where: { email: adminEmail, isActive: true },
  });
  const adminSecret = process.env.JWT_ACCESS_SECRET;
  if (admin && adminSecret) {
    const adminTok = jwt.sign(
      { sub: admin.id, email: admin.email, role: admin.role },
      adminSecret,
      { expiresIn: '15m' },
    );
    const missing = await req('GET', '/api/v1/admin/redeem', {
      token: adminTok,
    });
    missing.status === 200 && Array.isArray(missing.json?.codes)
      ? pass('admin_redeem_crud_api_live', `status=${missing.status}`)
      : fail('admin_redeem_crud_api_live', `status=${missing.status}`);

    const claims = await req('GET', '/api/v1/admin/claims', { token: adminTok });
    claims.status === 200
      ? pass('admin_claims_api_live', `status=${claims.status}`)
      : fail('admin_claims_api_live', `status=${claims.status}`);
  } else {
    fail('admin_jwt', 'missing admin or JWT_ACCESS_SECRET');
  }

  const stamp = Date.now().toString(36);
  const email = `e2e.redeem.hc.${stamp}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      displayName: 'Redeem HC',
      googleSub: `sub_redeem_hc_${stamp}`,
      coins: 0,
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );

  const created = await prisma.redeemCode.create({
    data: {
      title: 'E2E Live Card',
      type: 'GOOGLE_PLAY',
      valueLabel: '₹1 TEST',
      codeSecret: `E2E-${stamp}-LIVE-CODE`,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
      coinCost: null,
      expiresLabel: 'E2E',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      tip: 'E2E only',
      redeemUrl: 'https://play.google.com/redeem',
    },
  });

  const catalog = await req('GET', '/api/v1/redeem/catalog', { token: userTok });
  const items = catalog.json?.items ?? [];
  catalog.status === 200 && items.some((i: any) => i.id === created.id)
    ? pass('catalog_includes_live_db_row')
    : fail('catalog_includes_live_db_row', `status=${catalog.status}`);

  const demoIds = items.filter((i: any) =>
    ['1', '2', '3', '4', '5'].includes(String(i.id)),
  );
  demoIds.length === 0
    ? pass('catalog_ids_are_not_admin_demo_1_to_5')
    : fail('catalog_ids_are_not_admin_demo_1_to_5', JSON.stringify(demoIds));

  const live = items.find((i: any) => i.id === created.id);
  live && live.code == null && typeof live.codeMasked === 'string'
    ? pass('locked_item_hides_secret')
    : fail('locked_item_hides_secret', JSON.stringify(live));

  const claim = await req('POST', `/api/v1/redeem/${created.id}/claim`, {
    token: userTok,
  });
  const secret = claim.json?.code as string | undefined;
  (claim.status === 200 || claim.status === 201) &&
  secret === `E2E-${stamp}-LIVE-CODE` &&
  !looksMasked(secret)
    ? pass('claim_returns_real_secret')
    : fail('claim_returns_real_secret', JSON.stringify(claim.json));

  const after = await req('GET', '/api/v1/redeem/catalog', { token: userTok });
  const claimed = (after.json?.items ?? []).find(
    (i: any) => i.id === created.id,
  );
  claimed?.unlocked === true && claimed?.code === `E2E-${stamp}-LIVE-CODE`
    ? pass('reload_catalog_keeps_unlocked_secret')
    : fail('reload_catalog_keeps_unlocked_secret', JSON.stringify(claimed));

  await prisma.redeemClaim.deleteMany({ where: { redeemCodeId: created.id } });
  await prisma.redeemCode.delete({ where: { id: created.id } });
  await prisma.user.delete({ where: { id: user.id } });

  printSummary();
  await prisma.$disconnect();
  process.exit(checks.some((c) => !c.ok) ? 1 : 0);
}

function printSummary() {
  console.log(
    `\n${checks.filter((x) => x.ok).length}/${checks.length} passed`,
  );
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
