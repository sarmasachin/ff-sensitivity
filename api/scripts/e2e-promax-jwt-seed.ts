/**
 * Seed viewer JWT + peer Compare rows for ProMax crowd E2E (local Nest + Postgres).
 * Prints one JSON line: { ok, token, userId, email, deviceLabel, offsetFrom, matchCount, conf }
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

/** Emulator deviceLabel from ProMax crowd logs. */
const DEVICE =
  process.env.E2E_DEVICE_LABEL ?? 'Google sdk_gphone64_x86_64';
const FINGERS = '2 Fingers';
const ROLE = 'Rusher';

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
    { expiresIn: '2h' },
  );
}

function compareBody(over: Record<string, unknown> = {}) {
  return {
    deviceLabel: DEVICE,
    fingers: FINGERS,
    role: ROLE,
    dpiPreference: 'No DPI',
    screenGuard: 'Matte / Gaming',
    feedback: 'perfect',
    ramGb: 8,
    processorBrand: 'Google',
    processorType: 'fake-e2e-cpu',
    gpuLabel: 'fake-e2e-gpu',
    gpuVendor: 'Google',
    refreshHz: 60,
    suggested: {
      general: 100,
      redDot: 90,
      scope2x: 80,
      scope4x: 70,
      sniper: 50,
      freeLook: 100,
      fireButton: 50,
    },
    actual: {
      general: 112,
      redDot: 96,
      scope2x: 84,
      scope4x: 72,
      sniper: 52,
      freeLook: 104,
      fireButton: 52,
    },
    ...over,
  };
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
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function main() {
  loadEnv();
  if (!process.env.JWT_USER_SECRET) {
    console.log(JSON.stringify({ ok: false, error: 'JWT_USER_SECRET missing' }));
    process.exit(1);
  }

  const stamp = Date.now();
  const viewer = await prisma.user.create({
    data: {
      googleSub: `e2e-promax-viewer-${stamp}`,
      email: `e2e.promax.viewer.${stamp}@example.com`,
      displayName: 'ProMax E2E Viewer',
      isActive: true,
    },
  });
  const peerA = await prisma.user.create({
    data: {
      googleSub: `e2e-promax-peer-a-${stamp}`,
      email: `e2e.promax.peer.a.${stamp}@example.com`,
      displayName: 'ProMax Peer A',
      isActive: true,
    },
  });
  const peerB = await prisma.user.create({
    data: {
      googleSub: `e2e-promax-peer-b-${stamp}`,
      email: `e2e.promax.peer.b.${stamp}@example.com`,
      displayName: 'ProMax Peer B',
      isActive: true,
    },
  });

  const tokenA = tokenFor(peerA);
  const tokenB = tokenFor(peerB);
  const viewerToken = tokenFor(viewer);

  const saveA = await req('POST', '/api/v1/compare', {
    token: tokenA,
    body: compareBody({ actual: { ...compareBody().actual, general: 114 } }),
  });
  const saveB = await req('POST', '/api/v1/compare', {
    token: tokenB,
    body: compareBody({
      refreshHz: 60,
      actual: { ...compareBody().actual, general: 110, redDot: 94 },
    }),
  });

  const q = new URLSearchParams({
    fingers: FINGERS,
    role: ROLE,
    deviceLabel: DEVICE,
    ramGb: '8',
    processorBrand: 'Google',
    processorType: 'fake-e2e-cpu',
    gpuLabel: 'fake-e2e-gpu',
    gpuVendor: 'Google',
    dpiPreference: 'No DPI',
    screenGuard: 'Matte / Gaming',
    refreshHz: '60',
  });
  const offset = await req('GET', `/api/v1/compare/promax-offset?${q}`, {
    token: viewerToken,
  });
  const body = offset.json as {
    offsetFrom?: string;
    matchCount?: number;
    confidence?: number;
  } | null;

  const ok =
    saveA.status < 300 &&
    saveB.status < 300 &&
    offset.status === 200 &&
    !!body?.offsetFrom &&
    body.offsetFrom !== 'none' &&
    (body.matchCount ?? 0) >= 1;

  console.log(
    JSON.stringify({
      ok,
      token: viewerToken,
      userId: viewer.id,
      email: viewer.email,
      deviceLabel: DEVICE,
      offsetFrom: body?.offsetFrom ?? null,
      matchCount: body?.matchCount ?? 0,
      conf: body?.confidence ?? 0,
      saveA: saveA.status,
      saveB: saveB.status,
      offsetStatus: offset.status,
    }),
  );

  // Never leave fake peers/viewer in DB — Compare table must stay real-user only.
  await prisma.user.deleteMany({
    where: { id: { in: [viewer.id, peerA.id, peerB.id] } },
  });

  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.log(
    JSON.stringify({
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }),
  );
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
