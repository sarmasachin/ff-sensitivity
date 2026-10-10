/**
 * Session / JWT expiry e2e — the Daily Check-in "Unauthorized" / fake Wi-Fi bug.
 * npx ts-node --transpile-only scripts/e2e-auth-session.ts
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
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
  opts?: { token?: string; body?: unknown; rawAuth?: string },
) {
  const res = await fetch(`${API}${pathName}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts?.rawAuth ? { Authorization: opts.rawAuth } : {}),
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

function isSignIn401(r: { status: number; json: any }) {
  const code = r.json?.error?.code;
  const msg = String(r.json?.error?.message ?? '');
  return (
    r.status === 401 &&
    code === 'AUTH_REQUIRED' &&
    code !== 'Unauthorized' &&
    !msg.toLowerCase().includes('unauthorized') &&
    /sign in/i.test(msg)
  );
}

/** Mirrors app SessionExpiry.isJwtExpired (base64url payload + 30s leeway). */
function appJwtExpired(token: string, leewayMs = 30_000): boolean {
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

/** Mirrors app SessionExpiry.notifyIfUnauthorized. */
function appWouldAutoLogout(
  httpCode: number,
  requestPath: string,
  hadBearer: boolean,
): boolean {
  if (httpCode !== 401 || !hadBearer) return false;
  if (requestPath.includes('/user/auth/google')) return false;
  if (requestPath.includes('/user/auth/logout')) return false;
  return true;
}

async function main() {
  const prisma = new PrismaClient();
  const stamp = Date.now();
  const user = await prisma.user.create({
    data: {
      googleSub: `e2e-auth-session-${stamp}`,
      email: `e2e-auth-session-${stamp}@ffsensitivity.local`,
      displayName: 'E2E Auth Session',
      coins: 0,
      streakDays: 0,
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
  const noExp = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    SECRET,
  );
  const wrongSig = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: 0 },
    'wrong-secret-not-the-real-one-min-32!!',
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: live });
    r.status === 200 && typeof r.json?.coins === 'number'
      ? pass('live JWT wallet ok', `coins=${r.json.coins}`)
      : fail('live JWT wallet ok', `HTTP ${r.status} ${r.json?.error?.code}`);
  }
  {
    const r = await req('GET', '/api/v1/challenge/today', { token: live });
    r.status === 200
      ? pass('live JWT challenge today ok', `HTTP ${r.status}`)
      : fail('live JWT challenge today ok', `HTTP ${r.status} ${r.json?.error?.code}`);
  }
  {
    const r = await req('POST', '/api/v1/economy/challenge/earn', {
      token: live,
      body: { kind: 'CHECKIN' },
    });
    (r.status === 200 || r.status === 201) && r.json?.coins === 20
      ? pass('live JWT check-in +20', `coins=${r.json?.coins}`)
      : fail('live JWT check-in +20', `HTTP ${r.status} coins=${r.json?.coins}`);
  }

  {
    const r = await req('GET', '/api/v1/economy/wallet');
    isSignIn401(r)
      ? pass('missing token is AUTH_REQUIRED not Unauthorized', r.json?.error?.code)
      : fail(
          'missing token is AUTH_REQUIRED not Unauthorized',
          `HTTP ${r.status} code=${r.json?.error?.code} msg=${r.json?.error?.message}`,
        );
  }
  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: 'not.a.jwt' });
    isSignIn401(r)
      ? pass('garbage JWT is AUTH_REQUIRED not Unauthorized', r.json?.error?.code)
      : fail(
          'garbage JWT is AUTH_REQUIRED not Unauthorized',
          `HTTP ${r.status} code=${r.json?.error?.code} msg=${r.json?.error?.message}`,
        );
  }
  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: wrongSig });
    isSignIn401(r)
      ? pass('bad signature is AUTH_REQUIRED not Unauthorized', r.json?.error?.code)
      : fail(
          'bad signature is AUTH_REQUIRED not Unauthorized',
          `HTTP ${r.status} code=${r.json?.error?.code}`,
        );
  }
  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: expired });
    isSignIn401(r)
      ? pass('expired JWT wallet asks to sign in', r.json?.error?.message)
      : fail(
          'expired JWT wallet asks to sign in',
          `HTTP ${r.status} code=${r.json?.error?.code} msg=${r.json?.error?.message}`,
        );
  }
  {
    const r = await req('GET', '/api/v1/challenge/today', { token: expired });
    isSignIn401(r)
      ? pass('expired JWT challenge today asks to sign in', r.json?.error?.code)
      : fail(
          'expired JWT challenge today asks to sign in',
          `HTTP ${r.status} code=${r.json?.error?.code} msg=${r.json?.error?.message}`,
        );
  }
  {
    const r = await req('POST', '/api/v1/economy/challenge/earn', {
      token: expired,
      body: { kind: 'CHECKIN' },
    });
    isSignIn401(r)
      ? pass('expired JWT check-in asks to sign in (not Unauthorized)', r.json?.error?.message)
      : fail(
          'expired JWT check-in asks to sign in (not Unauthorized)',
          `HTTP ${r.status} code=${r.json?.error?.code} msg=${r.json?.error?.message}`,
        );
  }
  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: noExp });
    isSignIn401(r)
      ? pass('JWT without exp is rejected', r.json?.error?.code)
      : fail(
          'JWT without exp is rejected',
          `HTTP ${r.status} code=${r.json?.error?.code} msg=${r.json?.error?.message}`,
        );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  });
  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: live });
    r.status === 401 && r.json?.error?.code === 'AUTH_REVOKED'
      ? pass('revoked JWT stays AUTH_REVOKED', r.json?.error?.message)
      : fail(
          'revoked JWT stays AUTH_REVOKED',
          `HTTP ${r.status} code=${r.json?.error?.code} msg=${r.json?.error?.message}`,
        );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: 0, isActive: false },
  });
  {
    const r = await req('GET', '/api/v1/economy/wallet', { token: live });
    r.status === 401 && r.json?.error?.code === 'AUTH_INVALID'
      ? pass('inactive account stays AUTH_INVALID', r.json?.error?.code)
      : fail(
          'inactive account stays AUTH_INVALID',
          `HTTP ${r.status} code=${r.json?.error?.code}`,
        );
  }

  {
    const r = await req('POST', '/api/v1/user/auth/google', {
      body: { idToken: 'fake' },
    });
    r.status === 401 && r.json?.error?.code === 'AUTH_GOOGLE_INVALID'
      ? pass('google bad token stays AUTH_GOOGLE_INVALID', r.json?.error?.code)
      : fail(
          'google bad token stays AUTH_GOOGLE_INVALID',
          `HTTP ${r.status} code=${r.json?.error?.code}`,
        );
  }

  const authSrc = fs.readFileSync(
    path.join(__dirname, '../src/user-auth/user-auth.service.ts'),
    'utf8',
  );
  /expiresIn:\s*60 \* 60 \* 24 \* 90/.test(authSrc)
    ? pass('user-auth.service issues 90d JWT')
    : fail('user-auth.service issues 90d JWT', 'expiresIn is not 90d');

  {
    const decoded = jwt.decode(live) as { exp?: number } | null;
    const remaining = (decoded?.exp ?? 0) * 1000 - Date.now();
    const min = 89 * 24 * 60 * 60 * 1000;
    const max = 91 * 24 * 60 * 60 * 1000;
    remaining > min && remaining < max
      ? pass('fresh user JWT remaining ~90d', `${Math.round(remaining / 86400000)}d`)
      : fail('fresh user JWT remaining ~90d', `remainingMs=${remaining}`);
  }

  appJwtExpired(live) === false
    ? pass('app local exp: live 90d JWT is not expired')
    : fail('app local exp: live 90d JWT is not expired');
  appJwtExpired(expired)
    ? pass('app local exp: expired JWT is expired')
    : fail('app local exp: expired JWT is expired');
  appJwtExpired('not.a.jwt')
    ? pass('app local exp: garbage JWT is expired')
    : fail('app local exp: garbage JWT is expired');
  appJwtExpired(noExp)
    ? pass('app local exp: no-exp JWT is expired')
    : fail('app local exp: no-exp JWT is expired');

  appWouldAutoLogout(401, '/api/v1/economy/wallet', true)
    ? pass('app interceptor: wallet 401 kicks to login')
    : fail('app interceptor: wallet 401 kicks to login');
  appWouldAutoLogout(401, '/api/v1/challenge/today', true)
    ? pass('app interceptor: challenge 401 kicks to login')
    : fail('app interceptor: challenge 401 kicks to login');
  !appWouldAutoLogout(401, '/api/v1/user/auth/google', true)
    ? pass('app interceptor: google login 401 does not kick')
    : fail('app interceptor: google login 401 does not kick');
  !appWouldAutoLogout(401, '/api/v1/user/auth/logout', true)
    ? pass('app interceptor: logout 401 does not kick')
    : fail('app interceptor: logout 401 does not kick');
  !appWouldAutoLogout(401, '/api/v1/economy/wallet', false)
    ? pass('app interceptor: no bearer does not kick')
    : fail('app interceptor: no bearer does not kick');
  !appWouldAutoLogout(403, '/api/v1/economy/wallet', true)
    ? pass('app interceptor: 403 does not kick')
    : fail('app interceptor: 403 does not kick');

  {
    const r = await req('GET', '/api/v1/redeem/catalog', { token: expired });
    isSignIn401(r)
      ? pass('expired JWT redeem catalog asks to sign in', r.json?.error?.code)
      : fail(
          'expired JWT redeem catalog asks to sign in',
          `HTTP ${r.status} code=${r.json?.error?.code}`,
        );
  }
  {
    const r = await req('GET', '/api/v1/scratch/config', { token: expired });
    isSignIn401(r)
      ? pass('expired JWT scratch config asks to sign in', r.json?.error?.code)
      : fail(
          'expired JWT scratch config asks to sign in',
          `HTTP ${r.status} code=${r.json?.error?.code}`,
        );
  }
  {
    const r = await req('GET', '/api/v1/community/feed', { token: expired });
    isSignIn401(r)
      ? pass('expired JWT community feed asks to sign in', r.json?.error?.code)
      : fail(
          'expired JWT community feed asks to sign in',
          `HTTP ${r.status} code=${r.json?.error?.code}`,
        );
  }
  {
    const r = await req('POST', '/api/v1/user/auth/logout', {
      token: expired,
      body: { installId: '00000000-0000-4000-8000-000000000001' },
    });
    isSignIn401(r)
      ? pass('expired JWT logout is AUTH_REQUIRED (app treats as already dead)', r.json?.error?.code)
      : fail(
          'expired JWT logout is AUTH_REQUIRED (app treats as already dead)',
          `HTTP ${r.status} code=${r.json?.error?.code} msg=${r.json?.error?.message}`,
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
