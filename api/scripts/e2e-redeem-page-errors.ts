/**
 * Redeem page error-handling: UI wiring + live API error bodies.
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

function userFacing(json: any): boolean {
  const msg = json?.error?.message;
  return (
    typeof msg === 'string' &&
    msg.length > 0 &&
    !/\n\s*at\s+\S/.test(msg) &&
    !msg.includes('Prisma') &&
    !msg.includes('TypeError')
  );
}

async function main() {
  loadEnv();
  const page = readRepo('admin/src/app/(ops)/redeem/page.tsx');
  const form = readRepo('admin/src/components/redeem/RedeemFormModal.tsx');
  const api = readRepo('admin/src/components/redeem/redeem-api.ts');
  const claims = readRepo(
    'admin/src/components/redeem/RedeemClaimLogDrawer.tsx',
  );
  const lib = readRepo('admin/src/lib/api.ts');

  page.includes('Failed to load redeem codes') &&
  page.includes('Save failed.') &&
  page.includes('Reveal failed.') &&
  page.includes('Delete failed.') &&
  page.includes('Retry') &&
  page.includes('void load()')
    ? pass('page_has_fallback_error_copy')
    : fail('page_has_fallback_error_copy');

  !page.includes('window.confirm') &&
  page.includes('SupportConfirmDialog') &&
  page.includes('requestDelete')
    ? pass('delete_uses_confirm_dialog')
    : fail('delete_uses_confirm_dialog');

  !page.includes('setRows([])')
    ? pass('load_fail_keeps_existing_rows')
    : fail('load_fail_keeps_existing_rows');

  page.includes('!loading && !error && rows.length === 0') &&
  page.includes('rows.length > 0 && filtered.length === 0') &&
  page.includes('error && rows.length === 0 ? null')
    ? pass('empty_states_hidden_when_error')
    : fail('empty_states_hidden_when_error');

  page.includes('if (!row || busyId) return') &&
  (page.includes('setBusyId(id)') || page.includes('setBusyId(row.id)'))
    ? pass('reveal_delete_busy_guard')
    : fail('reveal_delete_busy_guard');

  page.includes('Reveal returned an empty code')
    ? pass('empty_reveal_treated_as_error')
    : fail('empty_reveal_treated_as_error');

  page.includes('e instanceof Error ? e.message')
    ? pass('api_messages_surface_on_page')
    : fail('api_messages_surface_on_page');

  form.includes('if (submitting) return') &&
  form.includes('disabled={submitting}')
    ? pass('form_blocks_double_submit')
    : fail('form_blocks_double_submit');

  api.includes('Title is required.') &&
  api.includes('Code must be at least 8 characters.') &&
  api.includes('Stock must be 0 or 1.') &&
  api.includes('Coin cost must be a valid number.')
    ? pass('client_validates_before_post')
    : fail('client_validates_before_post');

  claims.includes('Failed to load claims.') &&
  claims.indexOf('{error ?') < claims.indexOf('visible.length === 0')
    ? pass('claim_log_error_before_empty')
    : fail('claim_log_error_before_empty');

  lib.includes('class ApiClientError') &&
  lib.includes('data.error?.message')
    ? pass('api_client_forwards_server_message')
    : fail('api_client_forwards_server_message');

  const pageLines = page.split(/\r?\n/).length;
  const formLines = form.split(/\r?\n/).length;
  pageLines <= 400 && formLines <= 400
    ? pass('page_and_form_under_400', `${pageLines}/${formLines}`)
    : fail('page_and_form_under_400', `${pageLines}/${formLines}`);

  const superAdmin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (!superAdmin || !process.env.JWT_ACCESS_SECRET) {
    fail('admin_jwt');
    process.exit(1);
  }
  const adminTok = jwt.sign(
    { sub: superAdmin.id, email: superAdmin.email, role: superAdmin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );

  const unauth = await req('GET', '/api/v1/admin/redeem');
  unauth.status === 401 && userFacing(unauth.json)
    ? pass('list_401_user_facing')
    : fail('list_401_user_facing', JSON.stringify(unauth.json));

  const viewer = await prisma.admin.create({
    data: {
      email: `e2e.redeem.err.viewer.${Date.now()}@example.com`,
      passwordHash: superAdmin.passwordHash,
      role: 'VIEWER',
      allowedModules: ['redeem'],
      isActive: true,
    },
  });
  const viewerTok = jwt.sign(
    { sub: viewer.id, email: viewer.email, role: viewer.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );
  const stamp = Date.now().toString();
  const base = {
    title: 'Err Card',
    type: 'GOOGLE_PLAY',
    valueLabel: 'x',
    codeSecret: `ERRPAGE${stamp}SECRET`,
    status: 'ACTIVE',
    cadence: 'DAILY',
    stockLeft: 1,
  };
  const forbidden = await req('POST', '/api/v1/admin/redeem', {
    token: viewerTok,
    body: base,
  });
  forbidden.status === 403 && userFacing(forbidden.json)
    ? pass('viewer_403_user_facing', forbidden.json?.error?.message)
    : fail('viewer_403_user_facing', JSON.stringify(forbidden.json));

  const badStock = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: { ...base, stockLeft: 5 },
  });
  badStock.status === 400 && userFacing(badStock.json)
    ? pass('stock_400_user_facing', badStock.json?.error?.message)
    : fail('stock_400_user_facing', JSON.stringify(badStock.json));

  const short = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: { ...base, codeSecret: 'ABC' },
  });
  short.status === 400 && userFacing(short.json)
    ? pass('short_secret_400_user_facing', short.json?.error?.message)
    : fail('short_secret_400_user_facing', JSON.stringify(short.json));

  const created = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: base,
  });
  const id = created.json?.id as string | undefined;
  (created.status === 200 || created.status === 201) && id
    ? pass('create_ok_for_conflict_setup')
    : fail('create_ok_for_conflict_setup', JSON.stringify(created.json));

  const dup = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: { ...base, title: 'Dup' },
  });
  dup.status === 409 &&
  userFacing(dup.json) &&
  String(dup.json?.error?.message).toLowerCase().includes('already')
    ? pass('duplicate_409_user_facing', dup.json?.error?.message)
    : fail('duplicate_409_user_facing', JSON.stringify(dup.json));

  const missing = await req(
    'POST',
    '/api/v1/admin/redeem/notarealidxx/reveal',
    { token: adminTok, body: {} },
  );
  (missing.status === 400 || missing.status === 404) && userFacing(missing.json)
    ? pass('reveal_missing_user_facing', missing.json?.error?.message)
    : fail('reveal_missing_user_facing', JSON.stringify(missing.json));

  const gone = await req('DELETE', '/api/v1/admin/redeem/notarealidxx', {
    token: adminTok,
  });
  (gone.status === 400 || gone.status === 404) && userFacing(gone.json)
    ? pass('delete_missing_user_facing', gone.json?.error?.message)
    : fail('delete_missing_user_facing', JSON.stringify(gone.json));

  if (id) {
    await req('DELETE', `/api/v1/admin/redeem/${id}`, { token: adminTok });
  }
  await prisma.admin.delete({ where: { id: viewer.id } });

  const leftover = await prisma.redeemCode.findMany({
    where: { codeSecret: { startsWith: 'ERRPAGE' } },
    select: { id: true },
  });
  leftover.length === 0
    ? pass('no_leftover_error_e2e_rows')
    : fail('no_leftover_error_e2e_rows');

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
