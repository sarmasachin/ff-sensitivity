/**
 * Users desk: list length must match stats.total (no silent take:500 cap).
 * Run: npx ts-node --transpile-only scripts/e2e-users-list-cap-audit.ts
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

async function main() {
  loadEnv();
  const admin = await prisma.admin.findFirst({
    where: { role: 'SUPER_ADMIN', isActive: true },
  });
  if (!admin) throw new Error('no admin');
  const tok = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );

  const dbCount = await prisma.user.count();
  const res = await fetch(`${API}/api/v1/admin/users`, {
    headers: { Authorization: `Bearer ${tok}` },
  });
  const json: any = await res.json();
  const listN = Array.isArray(json?.users) ? json.users.length : -1;
  const statsTotal = Number(json?.stats?.total ?? -1);

  console.log(`DB_COUNT=${dbCount}`);
  console.log(`LIST_LEN=${listN}`);
  console.log(`STATS_TOTAL=${statsTotal}`);
  console.log(`HTTP=${res.status}`);

  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'users', 'users.service.ts'),
    'utf8',
  );
  const stillCapped = /findMany\(\{[^}]*take:\s*500/s.test(src);
  stillCapped
    ? console.log('FAIL  findMany still has take: 500')
    : console.log('PASS  findMany has no take: 500 cap');

  const ok =
    res.status === 200 &&
    listN === dbCount &&
    statsTotal === dbCount &&
    !stillCapped;
  ok
    ? console.log('PASS  list length matches DB + stats.total')
    : console.log('FAIL  list/stats/DB mismatch');

  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
