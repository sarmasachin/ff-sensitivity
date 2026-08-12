/**
 * Shop admin page error-handling E2E: UI wiring + live API user-facing messages.
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

function read(rel: string) {
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

function hasMsg(json: any): boolean {
  return typeof json?.error?.message === 'string' && json.error.message.length > 0;
}

async function main() {
  loadEnv();
  console.log('API', API);
  console.log('--- SHOP UI ERROR HANDLING ---\n');

  const page = read('admin/src/app/(ops)/shop/page.tsx');
  const form = read('admin/src/components/shop/ShopFormModal.tsx');
  const data = read('admin/src/components/shop/shop-data.ts');
  const api = read('admin/src/lib/api.ts');

  // --- Static wiring (page / form / client) ---
  page.includes('setError(') &&
  page.includes('Failed to load shop items.') &&
  page.includes('border-rose-200') &&
  page.includes('Retry') &&
  page.includes('void load()')
    ? pass('page_load_error_banner')
    : fail('page_load_error_banner');

  page.includes('setNotice(') &&
  page.includes('border-amber') &&
  page.includes('Added “') &&
  page.includes('Updated “')
    ? pass('page_success_notice')
    : fail('page_success_notice');

  page.includes('setNotice(null)') &&
  page.includes('return e instanceof Error ? e.message : "Save failed."') &&
  form.includes('setError(err)') &&
  form.includes('border-rose-200')
    ? pass('form_save_error_in_modal')
    : fail('form_save_error_in_modal');

  page.includes('Failed to add category.') &&
  form.includes('handleAddCategory') &&
  form.includes('Category ID must start with a letter') &&
  form.includes('setError(err)')
    ? pass('form_category_error_in_modal')
    : fail('form_category_error_in_modal');

  page.includes('Update failed.') &&
  page.includes('Delete failed.') &&
  page.includes('setNotice(null)')
    ? pass('toggle_delete_page_errors')
    : fail('toggle_delete_page_errors');

  page.includes('You do not have access to Shop.')
    ? pass('access_denied_message')
    : fail('access_denied_message');

  data.includes('Title is required.') &&
  data.includes('Price must be a number greater than 0.') &&
  data.includes('at least 2 letters or numbers')
    ? pass('client_form_validation_messages')
    : fail('client_form_validation_messages');

  api.includes('class ApiClientError') &&
  api.includes('error?.message') &&
  api.includes('throw new ApiClientError')
    ? pass('apiFetch_surfaces_server_message')
    : fail('apiFetch_surfaces_server_message');

  form.includes('submitting') &&
  form.includes('if (submitting) return') &&
  page.includes('if (!row || busyId) return')
    ? pass('busy_guards_double_submit')
    : fail('busy_guards_double_submit');

  // --- Live API: auth / permission / validation messages ---
  if (!process.env.JWT_ACCESS_SECRET) {
    fail('jwt_secret');
    process.exit(1);
  }
  const admin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (!admin) {
    fail('superadmin');
    process.exit(1);
  }
  const adminTok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '20m' },
  );

  const unauth = await req('GET', '/api/v1/admin/shop');
  unauth.status === 401 && hasMsg(unauth.json)
    ? pass('api_unauth_has_message', unauth.json.error.message)
    : fail('api_unauth_has_message', JSON.stringify(unauth.json));

  const viewer = await prisma.admin.create({
    data: {
      email: `e2e.shop.err.${Date.now()}@example.com`,
      passwordHash: admin.passwordHash,
      role: 'VIEWER',
      allowedModules: ['shop'],
      isActive: true,
    },
  });
  const viewerTok = jwt.sign(
    { sub: viewer.id, email: viewer.email, role: viewer.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '20m' },
  );
  const forbidden = await req('POST', '/api/v1/admin/shop', {
    token: viewerTok,
    body: {
      id: `err_forbid_${Date.now()}`,
      title: 'Nope',
      subtitle: 'Nope',
      category: 'PACK',
      priceCoins: 10,
      enabled: true,
      oneTime: true,
      rewardTag: 'NO',
    },
  });
  forbidden.status === 403 && hasMsg(forbidden.json)
    ? pass('api_forbidden_has_message', forbidden.json.error.message)
    : fail('api_forbidden_has_message', JSON.stringify(forbidden.json));

  const stamp = Date.now();
  const badId = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id: 'BAD ID',
      title: 'Bad',
      subtitle: 'Bad',
      category: 'PACK',
      priceCoins: 10,
      enabled: true,
      oneTime: true,
      rewardTag: 'T',
    },
  });
  (badId.status === 400 || badId.status === 422) &&
  hasMsg(badId.json) &&
  String(badId.json.error.message).toLowerCase().includes('id')
    ? pass('api_bad_id_message', badId.json.error.message)
    : fail('api_bad_id_message', JSON.stringify(badId.json));

  const badPrice = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id: `err_price_${stamp}`,
      title: 'Bad Price',
      subtitle: 'Bad',
      category: 'PACK',
      priceCoins: 0,
      enabled: true,
      oneTime: true,
      rewardTag: 'T',
    },
  });
  badPrice.status === 400 &&
  hasMsg(badPrice.json) &&
  String(badPrice.json.error.message).toLowerCase().includes('price')
    ? pass('api_bad_price_message', badPrice.json.error.message)
    : fail('api_bad_price_message', JSON.stringify(badPrice.json));

  const badCat = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id: `err_cat_${stamp}`,
      title: 'Bad Cat',
      subtitle: 'Should fail',
      category: `NOEXIST${String(stamp).slice(-6)}`,
      priceCoins: 10,
      enabled: true,
      oneTime: true,
      rewardTag: 'BAD',
    },
  });
  badCat.status === 400 &&
  badCat.json?.error?.code === 'SHOP_BAD_CATEGORY' &&
  hasMsg(badCat.json)
    ? pass('api_bad_category_message', badCat.json.error.message)
    : fail('api_bad_category_message', JSON.stringify(badCat.json));

  const id = `err_dup_${stamp}`;
  const created = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id,
      title: 'Dup Probe',
      subtitle: 'temp',
      category: 'PACK',
      priceCoins: 12,
      enabled: true,
      oneTime: true,
      rewardTag: 'DUP',
    },
  });
  const dup = await req('POST', '/api/v1/admin/shop', {
    token: adminTok,
    body: {
      id,
      title: 'Dup Probe 2',
      subtitle: 'temp',
      category: 'PACK',
      priceCoins: 12,
      enabled: true,
      oneTime: true,
      rewardTag: 'DUP',
    },
  });
  created.status < 300 &&
  dup.status === 409 &&
  dup.json?.error?.code === 'SHOP_ID_TAKEN' &&
  hasMsg(dup.json)
    ? pass('api_duplicate_id_message', dup.json.error.message)
    : fail('api_duplicate_id_message', JSON.stringify(dup.json));

  const missing = await req('PATCH', `/api/v1/admin/shop/no_such_item_${stamp}`, {
    token: adminTok,
    body: { title: 'Missing Item' },
  });
  missing.status === 404 &&
  missing.json?.error?.code === 'SHOP_NOT_FOUND' &&
  hasMsg(missing.json)
    ? pass('api_not_found_message', missing.json.error.message)
    : fail('api_not_found_message', JSON.stringify(missing.json));

  const catBad = await req('POST', '/api/v1/admin/shop/categories', {
    token: adminTok,
    body: { id: 'bad id', label: 'x' },
  });
  (catBad.status === 400 || catBad.status === 422) &&
  hasMsg(catBad.json) &&
  String(catBad.json.error.message).toLowerCase().includes('category')
    ? pass('api_bad_category_id_message', catBad.json.error.message)
    : fail('api_bad_category_id_message', JSON.stringify(catBad.json));

  // Cleanup
  await req('DELETE', `/api/v1/admin/shop/${id}`, { token: adminTok });
  await prisma.admin.delete({ where: { id: viewer.id } }).catch(() => undefined);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    `\nVERDICT: ${failed ? 'Shop error handling gaps found' : 'Shop error handling OK (wired + API messages)'}`,
  );
  console.log(`${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
