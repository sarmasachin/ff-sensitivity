/**
 * PRODUCTION redeem admin probe — no secrets printed.
 * Proves whether live API can accept admin redeem creates.
 *
 *   API_BASE=https://api.sensitivitysettings.com npx ts-node --transpile-only scripts/e2e-redeem-prod-probe.ts
 */
const API = process.env.API_BASE ?? 'https://api.sensitivitysettings.com';

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

async function req(method: string, pathName: string, body?: unknown) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, text: text.slice(0, 200) };
}

async function main() {
  console.log('API', API);

  const healthCandidates = [
    '/api/v1/health',
    '/health',
    '/api/health',
    '/api/v1/app/config',
  ];
  let healthHit = false;
  for (const p of healthCandidates) {
    const h = await req('GET', p);
    if (h.status > 0 && h.status < 500) {
      pass('prod_reachable', `${p} -> ${h.status}`);
      healthHit = true;
      break;
    }
  }
  if (!healthHit) fail('prod_reachable');

  const list = await req('GET', '/api/v1/admin/redeem');
  // Deployed + auth-guarded => 401/403. Missing route => 404.
  if (list.status === 401 || list.status === 403) {
    pass('admin_redeem_route_exists', `GET ${list.status}`);
  } else if (list.status === 404) {
    fail(
      'admin_redeem_route_exists',
      `GET 404 — RedeemAdminController not on live (body=${JSON.stringify(list.json ?? list.text)})`,
    );
  } else {
    fail('admin_redeem_route_exists', `GET unexpected ${list.status}`);
  }

  const create = await req('POST', '/api/v1/admin/redeem', {
    title: 'Prod Probe Should Not Persist',
    type: 'GOOGLE_PLAY',
    valueLabel: 'probe',
    codeSecret: 'PRODPROBESHOULDFAIL99',
    status: 'ACTIVE',
    cadence: 'DAILY',
    stockLeft: 1,
  });
  if (create.status === 401 || create.status === 403) {
    pass('admin_redeem_create_route_exists', `POST ${create.status}`);
  } else if (create.status === 404) {
    fail(
      'admin_redeem_create_route_exists',
      `POST 404 — live cannot add redeem codes via admin API`,
    );
  } else if (create.status === 200 || create.status === 201) {
    fail(
      'admin_redeem_create_route_exists',
      `POST ${create.status} without auth — security issue`,
    );
  } else {
    fail(
      'admin_redeem_create_route_exists',
      `POST unexpected ${create.status} ${JSON.stringify(create.json ?? create.text)}`,
    );
  }

  const claims = await req('GET', '/api/v1/admin/claims');
  claims.status === 401 || claims.status === 403
    ? pass('admin_claims_route_exists', `GET ${claims.status}`)
    : fail('admin_claims_route_exists', `GET ${claims.status}`);

  const catalog = await req('GET', '/api/v1/redeem/catalog');
  catalog.status === 401 || catalog.status === 403
    ? pass('app_catalog_route_exists', `GET ${catalog.status}`)
    : fail('app_catalog_route_exists', `GET ${catalog.status}`);

  const rootCause =
    list.status === 404 || create.status === 404
      ? 'ROOT_CAUSE: live API has app redeem + claims admin, but NO /api/v1/admin/redeem CRUD. Local redeem-admin files are untracked and not deployed.'
      : 'ROOT_CAUSE: admin redeem routes exist on live; failure is auth/validation, not missing deploy.';
  console.log('\n' + rootCause);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
