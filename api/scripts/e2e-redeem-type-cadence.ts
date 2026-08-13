/**
 * E2E: dynamic Redeem Type + Cadence (CRUD, catalog, create code, in-use delete).
 * Run: npx ts-node --transpile-only scripts/e2e-redeem-type-cadence.ts
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
    json = { raw: text.slice(0, 200) };
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

function signUser(user: { id: string; email: string }) {
  return jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

function readRepo(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function main() {
  loadEnv();
  const stamp = Date.now().toString(36).toUpperCase();
  const typeId = `E2E_T_${stamp}`.slice(0, 32);
  const cadenceId = `E2E_C_${stamp}`.slice(0, 32);
  const secret = `E2ETYPE${stamp}SECRET99`.slice(0, 24).toUpperCase();
  let codeId: string | null = null;

  const form = readRepo('admin/src/components/redeem/RedeemFormModal.tsx');
  const formDefs = readRepo(
    'admin/src/components/redeem/RedeemFormTypeCadence.tsx',
  );
  const formInv = readRepo(
    'admin/src/components/redeem/RedeemFormInventory.tsx',
  );
  form.includes('onCreateType') &&
  form.includes('RedeemFormTypeCadence') &&
  form.includes('RedeemFormInventory') &&
  formDefs.includes('Add type') &&
  formDefs.includes('Add cadence') &&
  formInv.includes('enabledTypes.map') &&
  formInv.includes('enabledCadences.map')
    ? pass('admin_form_dynamic_type_cadence_ui')
    : fail('admin_form_dynamic_type_cadence_ui');

  !form.includes('<option value="GOOGLE_PLAY">Play Gift</option>') &&
  !form.includes('<option value="DAILY">Daily</option>') &&
  !formInv.includes('<option value="GOOGLE_PLAY">Play Gift</option>')
    ? pass('admin_form_no_hardcoded_type_cadence_options')
    : fail('admin_form_no_hardcoded_type_cadence_options');

  const api = readRepo('admin/src/components/redeem/redeem-api.ts');
  api.includes('/api/v1/admin/redeem/types') &&
  api.includes('/api/v1/admin/redeem/cadences') &&
  api.includes('types: data.types')
    ? pass('admin_api_loads_types_cadences')
    : fail('admin_api_loads_types_cadences');

  const appModels = readRepo(
    'app/src/main/java/com/ffsensitivity/app/data/RedeemModels.kt',
  );
  appModels.includes('RedeemCatalogPayload') &&
  appModels.includes('RedeemCadenceOption') &&
  !appModels.includes('enum class RedeemType') &&
  !appModels.includes('enum class RedeemCadence')
    ? pass('app_type_cadence_are_dynamic_strings')
    : fail('app_type_cadence_are_dynamic_strings');

  const screen = readRepo(
    'app/src/main/java/com/ffsensitivity/app/presentation/screens/RedeemScreen.kt',
  );
  screen.includes('cadenceTabs') &&
  screen.includes('selectedCadenceId') &&
  screen.includes('payload.cadences')
    ? pass('app_tabs_from_catalog_cadences')
    : fail('app_tabs_from_catalog_cadences');

  const schema = readRepo('api/prisma/schema.prisma');
  schema.includes('model RedeemTypeDef') &&
  schema.includes('model RedeemCadenceDef') &&
  !schema.includes('enum RedeemType') &&
  !schema.includes('enum RedeemCadence')
    ? pass('schema_defs_not_enums')
    : fail('schema_defs_not_enums');

  const superAdmin = await prisma.admin.findFirst({
    where: {
      email: process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com',
      isActive: true,
    },
  });
  if (
    !superAdmin ||
    !process.env.JWT_ACCESS_SECRET ||
    !process.env.JWT_USER_SECRET
  ) {
    fail('admin_jwt_ready');
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }
  const adminTok = signAdmin(superAdmin);

  try {
    const ping = await fetch(`${API}/api/v1/app/config`, {
      signal: AbortSignal.timeout(4000),
    });
    ping.ok ? pass('api_up') : fail('api_up', `status=${ping.status}`);
  } catch (e) {
    fail('api_up', String(e));
    printSummary();
    await prisma.$disconnect();
    process.exit(1);
  }

  const list = await req('GET', '/api/v1/admin/redeem', { token: adminTok });
  Array.isArray(list.json?.types) &&
  Array.isArray(list.json?.cadences) &&
  list.json.types.some((t: any) => t.id === 'GOOGLE_PLAY') &&
  list.json.cadences.some((c: any) => c.id === 'DAILY')
    ? pass(
        'admin_list_includes_types_cadences',
        `types=${list.json.types.length} cadences=${list.json.cadences.length}`,
      )
    : fail(
        'admin_list_includes_types_cadences',
        `status=${list.status} body=${JSON.stringify(list.json).slice(0, 180)}`,
      );

  const createType = await req('POST', '/api/v1/admin/redeem/types', {
    token: adminTok,
    body: { id: typeId, label: `E2E Type ${stamp}` },
  });
  createType.status === 201 || createType.status === 200 || createType.json?.id === typeId
    ? pass('create_type', typeId)
    : fail(
        'create_type',
        `status=${createType.status} ${JSON.stringify(createType.json).slice(0, 160)}`,
      );

  const dupType = await req('POST', '/api/v1/admin/redeem/types', {
    token: adminTok,
    body: { id: typeId, label: 'Dup' },
  });
  dupType.status === 409
    ? pass('create_type_duplicate_409')
    : fail('create_type_duplicate_409', `status=${dupType.status}`);

  const badType = await req('POST', '/api/v1/admin/redeem/types', {
    token: adminTok,
    body: { id: 'bad-id', label: 'Bad' },
  });
  badType.status === 400
    ? pass('create_type_rejects_bad_id')
    : fail('create_type_rejects_bad_id', `status=${badType.status}`);

  const createCadence = await req('POST', '/api/v1/admin/redeem/cadences', {
    token: adminTok,
    body: {
      id: cadenceId,
      label: `E2E Cadence ${stamp}`,
      claimLimit: 5,
      windowHours: 12,
    },
  });
  createCadence.status === 201 ||
  createCadence.status === 200 ||
  createCadence.json?.id === cadenceId
    ? pass('create_cadence', cadenceId)
    : fail(
        'create_cadence',
        `status=${createCadence.status} ${JSON.stringify(createCadence.json).slice(0, 160)}`,
      );

  const unknownTypeCreate = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      title: `E2E Unknown Type ${stamp}`,
      type: 'NO_SUCH_TYPE_XYZ',
      valueLabel: 'Test',
      codeSecret: `${secret}X`,
      status: 'ACTIVE',
      cadence: 'DAILY',
      stockLeft: 1,
    },
  });
  unknownTypeCreate.status === 400
    ? pass('reject_unknown_type_on_code_create')
    : fail(
        'reject_unknown_type_on_code_create',
        `status=${unknownTypeCreate.status}`,
      );

  const created = await req('POST', '/api/v1/admin/redeem', {
    token: adminTok,
    body: {
      title: `E2E Dynamic ${stamp}`,
      type: typeId,
      valueLabel: 'Dynamic',
      codeSecret: secret,
      status: 'ACTIVE',
      cadence: cadenceId,
      stockLeft: 1,
      expiresLabel: 'E2E',
      tip: 'E2E tip',
      redeemUrl: 'https://play.google.com/redeem',
    },
  });
  if (created.status === 201 || created.status === 200 || created.json?.id) {
    codeId = created.json.id;
    pass('create_code_with_dynamic_type_cadence', codeId!);
  } else {
    fail(
      'create_code_with_dynamic_type_cadence',
      `status=${created.status} ${JSON.stringify(created.json).slice(0, 200)}`,
    );
  }

  const inUseType = await req(
    'DELETE',
    `/api/v1/admin/redeem/types/${encodeURIComponent(typeId)}`,
    { token: adminTok },
  );
  inUseType.status === 409
    ? pass('delete_type_blocked_when_in_use')
    : fail('delete_type_blocked_when_in_use', `status=${inUseType.status}`);

  const inUseCadence = await req(
    'DELETE',
    `/api/v1/admin/redeem/cadences/${encodeURIComponent(cadenceId)}`,
    { token: adminTok },
  );
  inUseCadence.status === 409
    ? pass('delete_cadence_blocked_when_in_use')
    : fail(
        'delete_cadence_blocked_when_in_use',
        `status=${inUseCadence.status}`,
      );

  let user = await prisma.user.findFirst({
    where: { email: 'e2e-redeem@ffsensitivity.local' },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        googleSub: 'e2e-redeem-type-cadence-sub',
        email: 'e2e-redeem@ffsensitivity.local',
        displayName: 'E2E Redeem',
      },
    });
  }
  const userTok = signUser(user);
  const catalog = await req('GET', '/api/v1/redeem/catalog', {
    token: userTok,
  });
  const hasType = (catalog.json?.types ?? []).some((t: any) => t.id === typeId);
  const hasCadence = (catalog.json?.cadences ?? []).some(
    (c: any) => c.id === cadenceId && c.claimLimit === 5 && c.windowHours === 12,
  );
  const hasItem =
    codeId &&
    (catalog.json?.items ?? []).some(
      (i: any) => i.id === codeId && i.type === typeId && i.cadence === cadenceId,
    );
  catalog.status === 200 && hasType && hasCadence && hasItem
    ? pass('app_catalog_exposes_dynamic_defs_and_item')
    : fail(
        'app_catalog_exposes_dynamic_defs_and_item',
        `status=${catalog.status} type=${hasType} cadence=${hasCadence} item=${hasItem}`,
      );

  const patchType = await req(
    'PATCH',
    `/api/v1/admin/redeem/types/${encodeURIComponent(typeId)}`,
    { token: adminTok, body: { label: `Renamed ${stamp}` } },
  );
  patchType.json?.label === `Renamed ${stamp}`
    ? pass('patch_type_label')
    : fail('patch_type_label', `status=${patchType.status}`);

  if (codeId) {
    await req('DELETE', `/api/v1/admin/redeem/${codeId}`, { token: adminTok });
    codeId = null;
  }

  const delType = await req(
    'DELETE',
    `/api/v1/admin/redeem/types/${encodeURIComponent(typeId)}`,
    { token: adminTok },
  );
  delType.status === 200 || delType.json?.ok
    ? pass('delete_type_after_unused')
    : fail('delete_type_after_unused', `status=${delType.status}`);

  const delCadence = await req(
    'DELETE',
    `/api/v1/admin/redeem/cadences/${encodeURIComponent(cadenceId)}`,
    { token: adminTok },
  );
  delCadence.status === 200 || delCadence.json?.ok
    ? pass('delete_cadence_after_unused')
    : fail('delete_cadence_after_unused', `status=${delCadence.status}`);

  printSummary();
  await prisma.$disconnect();
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
}

function printSummary() {
  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\nSummary: ${checks.length - failed.length}/${checks.length} passed`,
  );
  if (failed.length) {
    console.log('Failed:');
    for (const f of failed) console.log(`  - ${f.name}`);
  }
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
