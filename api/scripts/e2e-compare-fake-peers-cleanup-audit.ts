/**
 * Static + DB E2E: fake ProMax peers removed + list filter + seed cleanup.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const ROOT = path.join(__dirname, '../..');
const prisma = new PrismaClient();

function read(rel: string) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

async function main() {
  const checks: Record<string, boolean> = {};
  const notes: string[] = [];

  const service = read('api/src/compare/compare.service.ts');
  const seed = read('api/scripts/e2e-promax-jwt-seed.ts');
  const cleanup = read('api/scripts/cleanup-e2e-promax-fakes.ts');
  const dist = fs.existsSync(
    path.join(ROOT, 'api/dist/src/compare/compare.service.js'),
  )
    ? read('api/dist/src/compare/compare.service.js')
    : '';

  checks.list_filters_e2e_email =
    /u\.email NOT LIKE 'e2e\.promax\.%'/.test(service);
  checks.list_filters_e2e_google_sub =
    /u\.google_sub NOT LIKE 'e2e-promax-%'/.test(service);
  checks.list_filters_peer_names =
    /ProMax Peer A/.test(service) &&
    /ProMax Peer B/.test(service) &&
    /ProMax E2E Viewer/.test(service);

  checks.seed_deletes_created_users =
    /deleteMany\(\{\s*where: \{ id: \{ in: \[viewer\.id, peerA\.id, peerB\.id\] \} \}/s.test(
      seed,
    ) ||
    /id: \{ in: \[viewer\.id, peerA\.id, peerB\.id\] \}/.test(seed);

  checks.cleanup_script_exists =
    /e2e\.promax\./.test(cleanup) &&
    /ProMax Peer A/.test(cleanup) &&
    /deleteMany/.test(cleanup);

  checks.dist_has_filter =
    dist.length > 0 && /e2e\.promax\./.test(dist);

  const fakeLeft = await prisma.user.count({
    where: {
      OR: [
        { email: { startsWith: 'e2e.promax.' } },
        { googleSub: { startsWith: 'e2e-promax-' } },
        {
          displayName: {
            in: ['ProMax Peer A', 'ProMax Peer B', 'ProMax E2E Viewer'],
          },
        },
      ],
    },
  });
  checks.db_no_fake_users = fakeLeft === 0;

  const fakeNameCompares = await prisma.$queryRawUnsafe<
    Array<{ n: number }>
  >(`
    SELECT COUNT(*)::int AS n
    FROM sensitivity_compares sc
    JOIN users u ON u.id = sc.user_id
    WHERE u.email LIKE 'e2e.promax.%'
       OR u.google_sub LIKE 'e2e-promax-%'
       OR u.display_name IN ('ProMax Peer A', 'ProMax Peer B', 'ProMax E2E Viewer')
  `);
  checks.db_no_fake_compare_rows = (fakeNameCompares[0]?.n ?? 0) === 0;

  // List query shape still DISTINCT + LIMIT 50
  checks.list_still_distinct_50 =
    /DISTINCT ON \(sc\.user_id\)/.test(service) &&
    /const LIST_USERS = 50/.test(service);

  notes.push(`fakeUsersLeft=${fakeLeft}`);
  notes.push(`fakeCompareRows=${fakeNameCompares[0]?.n ?? 0}`);
  notes.push(
    'Seed still creates temporary peers for ProMax offset E2E, then deletes them before exit.',
  );

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(
    JSON.stringify(
      {
        ok,
        failed,
        counts: {
          total: Object.keys(checks).length,
          passed: Object.keys(checks).length - failed.length,
          failed: failed.length,
        },
        checks,
        notes,
      },
      null,
      2,
    ),
  );
  console.log(
    ok ? 'COMPARE_FAKE_PEERS_CLEANUP_OK' : 'COMPARE_FAKE_PEERS_CLEANUP_FAIL',
  );
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
