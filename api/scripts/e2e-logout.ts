/**
 * App Sign out e2e — mirrors UserAuthApi.logout + revokeSession.
 * npx ts-node --transpile-only scripts/e2e-logout.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const SECRET = process.env.JWT_USER_SECRET;
if (!SECRET) throw new Error('JWT_USER_SECRET missing');

type Check = { name: string; ok: boolean; detail?: string };
const checks: Check[] = [];
function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
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
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

/** Mirrors app ApiAuth.normalizeApiError */
function normalizeApiError(code: string, message: string, httpCode: number) {
  if (code === 'AUTH_GOOGLE_INVALID' || code === 'AUTH_SUSPENDED') {
    return { code, message };
  }
  const authCodes = new Set([
    'AUTH_REQUIRED',
    'AUTH_EXPIRED',
    'AUTH_INVALID',
    'AUTH_REVOKED',
    'HTTP_401',
  ]);
  const auth =
    httpCode === 401 ||
    code.toLowerCase() === 'unauthorized' ||
    authCodes.has(code);
  if (!auth) {
    return { code, message: message || 'Something went wrong. Please try again.' };
  }
  const msg =
    !message || message.toLowerCase() === 'unauthorized'
      ? 'Session expired. Sign in again.'
      : message;
  return { code: 'AUTH_REQUIRED', message: msg };
}

function isAuthFailureCode(code: string) {
  const c = code.trim();
  return (
    c.toLowerCase() === 'unauthorized' ||
    [
      'AUTH_REQUIRED',
      'AUTH_EXPIRED',
      'AUTH_INVALID',
      'AUTH_REVOKED',
      'HTTP_401',
    ].includes(c)
  );
}

/** Old revokeSession: AUTH_REVOKED / AUTH_INVALID / HTTP_401 only — after normalize this misses 401s. */
function oldClientClearsLocal(http: number, rawCode: string, rawMessage: string) {
  if (http >= 200 && http < 300) return true;
  const n = normalizeApiError(rawCode, rawMessage, http);
  return n.code === 'AUTH_REVOKED' || n.code === 'AUTH_INVALID' || n.code === 'HTTP_401';
}

/** New revokeSession: any auth failure after normalize. */
function newClientClearsLocal(http: number, rawCode: string, rawMessage: string) {
  if (http >= 200 && http < 300) return true;
  const n = normalizeApiError(rawCode, rawMessage, http);
  return isAuthFailureCode(n.code);
}

function appJwtExpired(token: string, leewayMs = 30_000) {
  const parts = token.split('.');
  if (parts.length < 2) return true;
  try {
    const json = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf8'),
    );
    const exp = Number(json.exp) || 0;
    if (exp <= 0) return true;
    return Date.now() > exp * 1000 + leewayMs;
  } catch {
    return true;
  }
}

function revokeSkipsNetwork(token: string) {
  return !token || appJwtExpired(token);
}

function androidInstallId() {
  return `dev_${'a'.repeat(24)}`;
}

async function main() {
  const prisma = new PrismaClient();
  const stamp = Date.now();
  const installId = androidInstallId();
  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-logout-${stamp}`,
      email: `e2e-logout-${stamp}@ffsensitivity.local`,
      displayName: 'E2E Logout',
      coins: 0,
      tokenVersion: 0,
    },
  });

  const live = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    SECRET,
    { expiresIn: 60 * 60 * 24 * 90 },
  );
  const expired = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      aud: 'user',
      tv: 0,
      exp: Math.floor(Date.now() / 1000) - 120,
    },
    SECRET,
  );

  {
    const r = await req('POST', '/api/v1/user/auth/logout', {
      body: { installId },
    });
    const code = String(r.json?.error?.code ?? '');
    const msg = String(r.json?.error?.message ?? '');
    r.status === 401 && code === 'AUTH_REQUIRED'
      ? pass('no token logout is AUTH_REQUIRED', code)
      : fail('no token logout is AUTH_REQUIRED', `HTTP ${r.status} code=${code}`);
    oldClientClearsLocal(r.status, code, msg)
      ? fail('OLD app would toast on missing-token logout (bug)', `clears=${oldClientClearsLocal(r.status, code, msg)}`)
      : pass('OLD app would toast on missing-token logout (reproduced bug)');
    newClientClearsLocal(r.status, code, msg)
      ? pass('NEW app clears local on missing-token logout')
      : fail('NEW app clears local on missing-token logout');
  }

  {
    const r = await req('POST', '/api/v1/user/auth/logout', {
      token: expired,
      body: { installId },
    });
    const code = String(r.json?.error?.code ?? '');
    const msg = String(r.json?.error?.message ?? '');
    r.status === 401 && code === 'AUTH_REQUIRED'
      ? pass('expired JWT logout is AUTH_REQUIRED', msg)
      : fail(
          'expired JWT logout is AUTH_REQUIRED',
          `HTTP ${r.status} code=${code} body=${JSON.stringify(r.json)}`,
        );
    const oldClears = oldClientClearsLocal(r.status, code, msg);
    const newClears = newClientClearsLocal(r.status, code, msg);
    !oldClears
      ? pass('OLD app would show Could not end session on expired logout')
      : fail('OLD app would show Could not end session on expired logout', 'old client unexpectedly clears');
    newClears
      ? pass('NEW app clears local on expired logout (no toast)')
      : fail('NEW app clears local on expired logout (no toast)');
    revokeSkipsNetwork(expired) && !revokeSkipsNetwork(live)
      ? pass('app skips Nest logout when JWT already expired')
      : fail('app skips Nest logout when JWT already expired');
  }

  {
    const r = await req('POST', '/api/v1/user/auth/logout', {
      token: live,
      body: { installId, extra: 'nope' },
    });
    r.status === 400
      ? pass('logout rejects extra body fields', r.json?.error?.code)
      : fail(
          'logout rejects extra body fields',
          `HTTP ${r.status} code=${r.json?.error?.code}`,
        );
  }

  {
    const r = await req('POST', '/api/v1/analytics/events', {
      token: live,
      body: {
        name: 'screen_session',
        installId,
        props: { screen: 'home', duration_ms: 2000 },
      },
    });
    const code = String(r.json?.error?.code ?? '');
    r.status < 500
      ? pass('sign-out first step screen_session does not 5xx', `HTTP ${r.status} ${code || 'ok'}`)
      : fail(
          'sign-out first step screen_session does not 5xx',
          `HTTP ${r.status} code=${code}`,
        );
  }

  {
    const r = await req('POST', '/api/v1/user/auth/logout', {
      token: live,
      body: { installId },
    });
    (r.status === 200 || r.status === 201) && r.json?.ok === true
      ? pass('live JWT logout 200 ok', `tv=${r.json?.tokenVersion}`)
      : fail(
          'live JWT logout 200 ok',
          `HTTP ${r.status} body=${JSON.stringify(r.json)}`,
        );
    newClientClearsLocal(r.status, String(r.json?.error?.code ?? ''), '')
      ? pass('NEW app clears local after live logout 200')
      : fail('NEW app clears local after live logout 200');
  }

  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: live });
    r.status === 401 && r.json?.error?.code === 'AUTH_REVOKED'
      ? pass('after logout wallet is AUTH_REVOKED', r.json?.error?.message)
      : fail(
          'after logout wallet is AUTH_REVOKED',
          `HTTP ${r.status} code=${r.json?.error?.code}`,
        );
  }

  {
    const r = await req('POST', '/api/v1/user/auth/logout', {
      token: live,
      body: { installId },
    });
    const code = String(r.json?.error?.code ?? '');
    const msg = String(r.json?.error?.message ?? '');
    r.status === 401 && code === 'AUTH_REVOKED'
      ? pass('second logout is AUTH_REVOKED', msg)
      : fail(
          'second logout is AUTH_REVOKED',
          `HTTP ${r.status} code=${code}`,
        );
    const n = normalizeApiError(code, msg, r.status);
    !oldClientClearsLocal(r.status, code, msg)
      ? pass('OLD app would toast on already-revoked logout (normalize → AUTH_REQUIRED)')
      : fail('OLD app would toast on already-revoked logout (normalize → AUTH_REQUIRED)');
    n.code === 'AUTH_REQUIRED' && newClientClearsLocal(r.status, code, msg)
      ? pass('NEW app clears local on already-revoked logout')
      : fail(
          'NEW app clears local on already-revoked logout',
          `normalized=${n.code} newClears=${newClientClearsLocal(r.status, code, msg)}`,
        );
  }

  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
  await prisma.$disconnect();

  const failed = checks.filter((c) => !c.ok);
  console.log(`\nSummary: ${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) {
    failed.forEach((f) => console.error(` - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
