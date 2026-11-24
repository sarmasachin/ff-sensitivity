/**
 * Live accuracy check: engine=one_tap vs promax peer isolation.
 * Seeds tagged peers, resolves offsets both ways, hits live Nest if up.
 * Prints one JSON summary + ENGINE_PEER_FILTER_OK / FAIL.
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { resolveProMaxOffsets } from '../src/compare/compare-promax-offset';
import {
  normalizeCompareEngine,
  peerEngineWhere,
} from '../src/compare/compare-promax-peer-load';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

const FINGERS = '2 Fingers';
const ROLE = 'One-Tap Headshot';
const TAG = `e2e_eng_filter_${Date.now()}`;
/** Unique per run so blend/waterfall never sees leftover peers. */
const DEVICE = `E2E EngFilter ${TAG}`;

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

function tokenFor(user: { id: string; email: string; tokenVersion: number }) {
  return jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: user.tokenVersion },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

async function ensureUser(email: string, name: string, googleSub: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      googleSub,
      email,
      displayName: name,
      isActive: true,
    },
  });
}

async function seedCompare(
  userId: string,
  engine: string | null,
  actualGeneral: number,
) {
  return prisma.sensitivityCompare.create({
    data: {
      userId,
      deviceLabel: DEVICE,
      fingers: FINGERS,
      role: ROLE,
      dpiPreference: 'No DPI',
      screenGuard: 'Matte / Gaming',
      feedback: 'perfect',
      ramGb: 8,
      ramBucket: 8,
      processorBrand: 'Google',
      processorType: `cpu-${TAG}`,
      gpuLabel: `gpu-${TAG}`,
      gpuVendor: 'Google',
      refreshHz: 60,
      refreshBucket: 60,
      engine,
      suggestedGeneral: 100,
      suggestedRedDot: 90,
      suggestedScope2x: 80,
      suggestedScope4x: 70,
      suggestedSniper: 50,
      suggestedFreeLook: 100,
      suggestedFireButton: 50,
      actualGeneral,
      actualRedDot: 96,
      actualScope2x: 84,
      actualScope4x: 72,
      actualSniper: 52,
      actualFreeLook: 104,
      actualFireButton: 52,
    },
  });
}

async function httpOffset(token: string, engine: string) {
  const q = new URLSearchParams({
    fingers: FINGERS,
    role: ROLE,
    deviceLabel: DEVICE,
    ramGb: '8',
    processorBrand: 'Google',
    processorType: `cpu-${TAG}`,
    gpuLabel: `gpu-${TAG}`,
    gpuVendor: 'Google',
    dpiPreference: 'No DPI',
    screenGuard: 'Matte / Gaming',
    refreshHz: '60',
    engine,
  });
  const res = await fetch(`${API}/api/v1/compare/promax-offset?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  loadEnv();
  const checks: Record<string, boolean> = {};
  const detail: Record<string, unknown> = {};

  // Unit: normalize + where shape
  checks.norm_one_tap = normalizeCompareEngine('one_tap_premium') === 'one_tap';
  checks.norm_promax = normalizeCompareEngine('premium_pro_max') === 'promax';
  const wOt = peerEngineWhere('one_tap') as { engine?: string };
  const wPm = peerEngineWhere('promax') as { OR?: unknown[] };
  checks.where_one_tap = wOt.engine === 'one_tap';
  checks.where_promax_or =
    Array.isArray(wPm.OR) && wPm.OR.length === 2;

  const viewer = await ensureUser(
    `e2e.eng.viewer.${TAG}@local.test`,
    'E2E Eng Viewer',
    `e2e-eng-viewer-${TAG}`,
  );
  // ≥5 peers each bucket → avoids BLEND_BELOW_N=5 soft-mix (keeps n/g exact).
  const otPeers = [];
  const pmPeers = [];
  for (let i = 0; i < 5; i++) {
    otPeers.push(
      await ensureUser(
        `e2e.eng.ot${i}.${TAG}@local.test`,
        `E2E OT${i}`,
        `e2e-eng-ot${i}-${TAG}`,
      ),
    );
    pmPeers.push(
      await ensureUser(
        `e2e.eng.pm${i}.${TAG}@local.test`,
        `E2E PM${i}`,
        `e2e-eng-pm${i}-${TAG}`,
      ),
    );
  }
  const peerLeg = await ensureUser(
    `e2e.eng.leg.${TAG}@local.test`,
    'E2E Legacy',
    `e2e-eng-leg-${TAG}`,
  );

  const seededIds: string[] = [];
  const allUsers = [viewer, ...otPeers, ...pmPeers, peerLeg];
  try {
    // Distinct offsets so wrong-bucket bleed is visible in averages.
    // one_tap peers: +20 general
    for (const u of otPeers) {
      seededIds.push((await seedCompare(u.id, 'one_tap', 120)).id);
    }
    // promax peers: +5 general
    for (const u of pmPeers) {
      seededIds.push((await seedCompare(u.id, 'promax', 105)).id);
    }
    // legacy null: +5 general (belongs in promax bucket only)
    seededIds.push((await seedCompare(peerLeg.id, null, 105)).id);

    // Raw Prisma count with same where as peerEngineWhere (no blend noise).
    const rawOt = await prisma.sensitivityCompare.count({
      where: {
        deviceLabel: DEVICE,
        fingers: FINGERS,
        role: ROLE,
        engine: 'one_tap',
        userId: { not: viewer.id },
      },
    });
    const rawPm = await prisma.sensitivityCompare.count({
      where: {
        deviceLabel: DEVICE,
        fingers: FINGERS,
        role: ROLE,
        OR: [{ engine: null }, { engine: 'promax' }],
        userId: { not: viewer.id },
      },
    });
    const rawOtBleed = await prisma.sensitivityCompare.count({
      where: {
        deviceLabel: DEVICE,
        fingers: FINGERS,
        role: ROLE,
        engine: 'one_tap',
        // Would be wrong if promax bucket somehow included these — just document.
      },
    });
    detail.raw_counts = { rawOt, rawPm, rawOtBleed };
    checks.raw_ot_count = rawOt === 5;
    checks.raw_pm_count = rawPm === 6; // 5 promax + 1 legacy

    const baseQ = {
      fingers: FINGERS,
      role: ROLE,
      deviceLabel: DEVICE,
      ramGb: 8,
      processorBrand: 'Google',
      processorType: `cpu-${TAG}`,
      gpuLabel: `gpu-${TAG}`,
      gpuVendor: 'Google',
      dpiPreference: 'No DPI',
      screenGuard: 'Matte / Gaming',
      refreshHz: 60,
      excludeUserId: viewer.id,
    };

    const ot = await resolveProMaxOffsets(prisma as never, {
      ...baseQ,
      engine: 'one_tap',
    });
    const pm = await resolveProMaxOffsets(prisma as never, {
      ...baseQ,
      engine: 'promax',
    });

    detail.resolve_one_tap = {
      from: ot.offsetFrom,
      n: ot.matchCount,
      g: ot.averageOffsets.general,
    };
    detail.resolve_promax = {
      from: pm.offsetFrom,
      n: pm.matchCount,
      g: pm.averageOffsets.general,
    };

    // n isolation (quality layer may shrink |offset|; do not require raw Δ).
    checks.resolve_ot_n = ot.matchCount === 5;
    checks.resolve_pm_n = pm.matchCount === 6;
    // +20 one_tap peers vs +5 promax/legacy → after quality shrink still separated.
    checks.resolve_ot_g_hi =
      ot.averageOffsets.general >= 10 && ot.averageOffsets.general <= 20;
    checks.resolve_pm_g_lo =
      pm.averageOffsets.general >= 1 && pm.averageOffsets.general <= 5;
    checks.resolve_no_bleed =
      ot.averageOffsets.general > pm.averageOffsets.general &&
      ot.matchCount === 5 &&
      pm.matchCount === 6;

    // Live Nest HTTP (must be restarted with new dist)
    const token = tokenFor(viewer);
    let httpOt: { status: number; body: Record<string, unknown> } | null =
      null;
    let httpPm: { status: number; body: Record<string, unknown> } | null =
      null;
    try {
      httpOt = await httpOffset(token, 'one_tap');
      httpPm = await httpOffset(token, 'promax');
    } catch (e) {
      detail.http_error = String(e);
    }

    if (httpOt && httpPm) {
      detail.http_one_tap = {
        status: httpOt.status,
        n: (httpOt.body as { matchCount?: number }).matchCount,
        g: (httpOt.body as { averageOffsets?: { general?: number } })
          .averageOffsets?.general,
      };
      detail.http_promax = {
        status: httpPm.status,
        n: (httpPm.body as { matchCount?: number }).matchCount,
        g: (httpPm.body as { averageOffsets?: { general?: number } })
          .averageOffsets?.general,
      };
      const otG =
        (httpOt.body as { averageOffsets?: { general?: number } })
          .averageOffsets?.general ?? -1;
      const pmG =
        (httpPm.body as { averageOffsets?: { general?: number } })
          .averageOffsets?.general ?? -1;
      checks.http_ot_ok =
        httpOt.status === 200 &&
        (httpOt.body as { matchCount?: number }).matchCount === 5 &&
        otG >= 10 &&
        otG <= 20;
      checks.http_pm_ok =
        httpPm.status === 200 &&
        (httpPm.body as { matchCount?: number }).matchCount === 6 &&
        pmG >= 1 &&
        pmG <= 5 &&
        otG > pmG;
    } else {
      checks.http_ot_ok = false;
      checks.http_pm_ok = false;
    }

    // DB column present
    const col = await prisma.$queryRawUnsafe<
      Array<{ column_name: string }>
    >(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'sensitivity_compares' AND column_name = 'engine'`,
    );
    checks.db_engine_column = col.length === 1;
  } finally {
    if (seededIds.length) {
      await prisma.sensitivityCompare.deleteMany({
        where: { id: { in: seededIds } },
      });
    }
    await prisma.user.deleteMany({
      where: { email: { in: allUsers.map((u) => u.email) } },
    });
    await prisma.$disconnect();
  }

  const failed = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ok = failed.length === 0;
  console.log(
    JSON.stringify(
      { ok, checks, failed, detail },
      null,
      2,
    ),
  );
  console.log(ok ? 'ENGINE_PEER_FILTER_OK' : 'ENGINE_PEER_FILTER_FAIL');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  console.log('ENGINE_PEER_FILTER_FAIL');
  process.exit(1);
});
