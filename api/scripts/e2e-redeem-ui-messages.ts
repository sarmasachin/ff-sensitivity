/**
 * Live UI-message contract for admin redeem (API + page wiring).
 * Does not store passwords; uses JWT like other redeem e2e scripts.
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
    body: opsBody(opts?.body),
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

function opsBody(body?: unknown) {
  return body !== undefined ? JSON.stringify(body) : undefined;
}

function userFacing(json: any): boolean {
  const msg = json?.error?.message;
  return typeof msg === 'string' && msg.length > 0;
}

async function main() {
  loadEnv();
  const page = readRepo('admin/src/app/(ops)/redeem/page.tsx');
  const form = readRepo('admin/src/components/redeem/RedeemFormModal.tsx');

  // Toast host (bottom-right): success / caution / error
  page.includes('RedeemToastHost') &&
  page.includes('useRedeemToasts') &&
  /push\(\s*"success"/.test(page) &&
  /push\(\s*"error"/.test(page) &&
  /push\(\s*"caution"/.test(page)
    ? pass('toast_host_wired')
    : fail('toast_host_wired');

  page.includes('REDEEM_TOAST_TITLES.added') &&
  page.includes('REDEEM_TOAST_TITLES.updated') &&
  page.includes('REDEEM_TOAST_TITLES.deleted') &&
  page.includes('REDEEM_TOAST_TITLES.revealed')
    ? pass('success_toast_wired')
    : fail('success_toast_wired');

  page.includes('actionLabel: "Retry"') &&
  page.includes('REDEEM_TOAST_TITLES.loadError')
    ? pass('error_toast_retry_wired')
    : fail('error_toast_retry_wired');

  page.includes('fixed right-') === false &&
  /fixed right-\d+ bottom-\d+/.test(
    readRepo('admin/src/components/redeem/RedeemToastHost.tsx'),
  )
    ? pass('toast_bottom_right_host')
    : fail('toast_bottom_right_host');

  form.includes('border-rose-200 bg-rose-50') &&
  form.includes('{error ?')
    ? pass('form_error_banner_wired')
    : fail('form_error_banner_wired');

  !page.includes('bg-emerald') && !page.includes('bg-green')
    ? pass('no_green_page_banner')
    : fail('no_green_page_banner');

  !page.includes('setWarning')
    ? pass('no_legacy_warning_state')
    : fail('no_legacy_warning_state');

  const admin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (!admin || !process.env.JWT_ACCESS_SECRET) {
    fail('admin_jwt');
    process.exit(1);
  }
  const tok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );

  const stamp = Date.now().toString();
  const secret = `MSGUI${stamp}CODE01`;
  const created = await req('POST', '/api/v1/admin/redeem', {
    token: tok,
    body: {
      title: 'Msg UI Card',
      type: 'GOOGLE_PLAY',
      valueLabel: '₹1',
      codeSecret: secret,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
    },
  });
  const id = created.json?.id as string | undefined;
  (created.status === 200 || created.status === 201) && id
    ? pass('create_succeeds_live', id)
    : fail('create_succeeds_live', JSON.stringify(created.json));

  const short = await req('POST', '/api/v1/admin/redeem', {
    token: tok,
    body: {
      title: 'Bad',
      type: 'GOOGLE_PLAY',
      valueLabel: 'x',
      codeSecret: 'SHORT',
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
    },
  });
  short.status === 400 && userFacing(short.json)
    ? pass('error_message_short_secret', short.json?.error?.message)
    : fail('error_message_short_secret', JSON.stringify(short.json));

  const dup = await req('POST', '/api/v1/admin/redeem', {
    token: tok,
    body: {
      title: 'Dup',
      type: 'GOOGLE_PLAY',
      valueLabel: 'x',
      codeSecret: secret,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
    },
  });
  dup.status === 409 && userFacing(dup.json)
    ? pass('error_message_duplicate', dup.json?.error?.message)
    : fail('error_message_duplicate', JSON.stringify(dup.json));

  const stock = await req('POST', '/api/v1/admin/redeem', {
    token: tok,
    body: {
      title: 'Stock',
      type: 'GOOGLE_PLAY',
      valueLabel: 'x',
      codeSecret: `MSGUI${stamp}STOCK9`,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 9,
    },
  });
  stock.status === 400 && userFacing(stock.json)
    ? pass('error_message_stock', stock.json?.error?.message)
    : fail('error_message_stock', JSON.stringify(stock.json));

  if (id) {
    await req('DELETE', `/api/v1/admin/redeem/${id}`, { token: tok });
  }

  const recent = await prisma.redeemCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, createdAt: true, status: true },
  });
  console.log('RECENT_CODES', JSON.stringify(recent));

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
