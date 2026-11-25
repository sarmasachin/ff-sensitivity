/**
 * Repro + fix check: GET /admin/app includes ads; PUT must not echo ads.
 * Run: npx ts-node --transpile-only scripts/e2e-app-save-ads-strip.ts
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
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
  const email = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    console.log('FAIL no admin', email);
    process.exit(1);
  }
  const tok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );

  const get = await req('GET', '/api/v1/admin/app', { token: tok });
  const cfg = get.json;
  console.log('GET_KEYS', Object.keys(cfg ?? {}).sort().join(','));
  console.log('HAS_ADS', !!cfg?.ads);

  const bad = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: cfg,
  });
  const badMsg = JSON.stringify(bad.json?.error ?? bad.json).slice(0, 220);
  console.log('PUT_WITH_ADS', bad.status, badMsg);
  // After DTO @Allow() ads: echo PUT must succeed (ads ignored, not written).
  const echoOk = bad.status === 200 && bad.json?.status != null;
  echoOk
    ? console.log('PASS  echo-ads PUT accepted (ads ignored on save)')
    : console.log('FAIL  echo-ads PUT', bad.status, badMsg);

  const cleanBody = {
    status: {
      ...cfg.status,
      forceUpdate: true,
      softUpdatePrompt: true,
      minVersionCode: 1,
      minVersionName: '1.0.0',
      maintenanceMode: false,
    },
    features: cfg.features,
    navigation: cfg.navigation,
    links: cfg.links,
  };
  const ok = await req('PUT', '/api/v1/admin/app', {
    token: tok,
    body: cleanBody,
  });
  console.log(
    'PUT_CLEAN',
    ok.status,
    `forceUpdate=${ok.json?.status?.forceUpdate} soft=${ok.json?.status?.softUpdatePrompt}`,
  );
  const cleanOk =
    ok.status === 200 &&
    ok.json?.status?.forceUpdate === true &&
    ok.json?.status?.softUpdatePrompt === true;
  cleanOk
    ? console.log('PASS  clean PUT saves force/soft update')
    : console.log('FAIL  clean PUT', JSON.stringify(ok.json).slice(0, 300));

  await prisma.$disconnect();
  process.exit(echoOk && cleanOk ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
