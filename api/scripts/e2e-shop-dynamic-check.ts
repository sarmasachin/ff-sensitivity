/**
 * Read-only: is admin Shop page fully dynamic (API/DB, no demo rows)?
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

async function main() {
  loadEnv();
  const page = read('admin/src/app/(ops)/shop/page.tsx');
  const data = read('admin/src/components/shop/shop-data.ts');
  const api = read('admin/src/components/shop/shop-api.ts');
  const form = read('admin/src/components/shop/ShopFormModal.tsx');

  page.includes('useState<ShopListRow[]>([])')
    ? pass('starts_empty_no_seed_rows')
    : fail('starts_empty_no_seed_rows');

  page.includes('fetchShopBundle') &&
  page.includes('createShopItem') &&
  page.includes('updateShopItem') &&
  page.includes('deleteShopItem')
    ? pass('all_crud_via_api_fns')
    : fail('all_crud_via_api_fns');

  !page.includes('SHOP_DEMO') &&
  !data.includes('SHOP_DEMO_ROWS') &&
  !data.includes('prize_google_play_gift') &&
  !data.includes('SHOP_API_UNAVAILABLE')
    ? pass('no_demo_or_hardcoded_catalog')
    : fail('no_demo_or_hardcoded_catalog');

  api.includes('/api/v1/admin/shop') && form.includes('await onSubmit')
    ? pass('client_and_form_async_live')
    : fail('client_and_form_async_live');

  api.includes('/api/v1/admin/shop/categories') &&
  api.includes('createShopCategory') &&
  form.includes('Add category') &&
  !data.includes('SHOP_CAPABILITIES') &&
  !data.includes('SHOP_CATEGORY_LABEL')
    ? pass('categories_dynamic_no_static_capabilities')
    : fail('categories_dynamic_no_static_capabilities');

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
    { expiresIn: '10m' },
  );
  const res = await fetch(`${API}/api/v1/admin/shop`, {
    headers: { Authorization: `Bearer ${tok}` },
  });
  const json: any = await res.json().catch(() => null);
  const db = await prisma.shopItem.count();
  const apiCount = Array.isArray(json?.items) ? json.items.length : -1;

  res.status === 200
    ? pass('live_list_ok', String(res.status))
    : fail('live_list_ok', String(res.status));

  apiCount === db
    ? pass('page_api_list_equals_db', `${apiCount}==${db}`)
    : fail('page_api_list_equals_db', `${apiCount}!=${db}`);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    `\nVERDICT: ${failed ? 'NOT fully dynamic' : 'Shop page is fully dynamic (API/DB)'}`,
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
