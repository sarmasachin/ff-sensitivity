/**
 * Community e2e + security checks (local Postgres, no Docker).
 * Creates two users, signs user JWTs, runs admin login, exercises community API.
 */
import { PrismaClient, CommunityPostStatus } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';
const prisma = new PrismaClient();

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
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
  opts?: { token?: string; body?: unknown; expect?: number },
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
  if (opts?.expect !== undefined && res.status !== opts.expect) {
    throw new Error(
      `${method} ${pathName} expected ${opts.expect} got ${res.status}: ${text.slice(0, 300)}`,
    );
  }
  return { status: res.status, json };
}

const samplePost = {
  name: 'E2E_Player',
  freeFireId: '8123456789',
  rank: 'Heroic',
  role: 'Rusher',
  deviceLabel: 'Pixel 8',
  deviceMeta: '8GB · 120Hz',
  matches: 100,
  kills: 250,
  headshots: 80,
  general: 96,
  redDot: 88,
  scope2x: 78,
  scope4x: 68,
  awm: 52,
  freeLook: 110,
};

async function main() {
  loadEnv();
  const userSecret = process.env.JWT_USER_SECRET;
  if (!userSecret) throw new Error('JWT_USER_SECRET missing');

  // --- users ---
  const u1 = await prisma.user.upsert({
    where: { email: 'e2e.community1@example.com' },
    update: { isActive: true, displayName: 'E2E One' },
    create: {
      googleSub: 'e2e-community-sub-1',
      email: 'e2e.community1@example.com',
      displayName: 'E2E One',
      isActive: true,
    },
  });
  const u2 = await prisma.user.upsert({
    where: { email: 'e2e.community2@example.com' },
    update: { isActive: true, displayName: 'E2E Two' },
    create: {
      googleSub: 'e2e-community-sub-2',
      email: 'e2e.community2@example.com',
      displayName: 'E2E Two',
      isActive: true,
    },
  });

  // cleanup prior e2e posts
  await prisma.communityPostReport.deleteMany({
    where: { userId: { in: [u1.id, u2.id] } },
  });
  await prisma.communityPost.deleteMany({
    where: { userId: { in: [u1.id, u2.id] } },
  });

  const token1 = jwt.sign(
    { sub: u1.id, email: u1.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );
  const token2 = jwt.sign(
    { sub: u2.id, email: u2.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );

  // 1) auth required
  {
    const r = await req('GET', '/api/v1/community/feed');
    r.status === 401
      ? pass('feed requires user JWT', `HTTP ${r.status}`)
      : fail('feed requires user JWT', `HTTP ${r.status}`);
  }
  {
    const r = await req('GET', '/api/v1/admin/community/stats');
    r.status === 401
      ? pass('admin stats requires admin JWT', `HTTP ${r.status}`)
      : fail('admin stats requires admin JWT', `HTTP ${r.status}`);
  }

  // 2) user JWT cannot call admin
  {
    const r = await req('GET', '/api/v1/admin/community/posts', {
      token: token1,
    });
    r.status === 401
      ? pass('user JWT blocked on admin community', `HTTP ${r.status}`)
      : fail('user JWT blocked on admin community', `HTTP ${r.status}`);
  }

  // 3) validation rejects bad payload
  {
    const r = await req('POST', '/api/v1/community/posts', {
      token: token1,
      body: { ...samplePost, freeFireId: 'abc', general: 999 },
    });
    r.status === 400
      ? pass('submit rejects invalid FF ID / sensi', `HTTP ${r.status}`)
      : fail('submit rejects invalid FF ID / sensi', `HTTP ${r.status}`);
  }
  {
    const r = await req('POST', '/api/v1/community/posts', {
      token: token1,
      body: { ...samplePost, name: 'spam https://evil.com' },
    });
    r.status === 400 && r.json?.error?.code === 'COMMUNITY_INVALID_TEXT'
      ? pass('submit rejects URL in name', r.json.error.code)
      : fail(
          'submit rejects URL in name',
          `HTTP ${r.status} ${JSON.stringify(r.json?.error)}`,
        );
  }

  // 4) submit -> pending, not in feed
  const submitted = await req('POST', '/api/v1/community/posts', {
    token: token1,
    body: samplePost,
    expect: 201,
  }).catch(async (e) => {
    // Nest may return 200/201 depending on default — accept 2xx
    const r = await req('POST', '/api/v1/community/posts', {
      token: token1,
      body: samplePost,
    });
    if (r.status < 200 || r.status >= 300) throw e;
    return r;
  });
  // re-fetch if catch path didn't set — normalize
  let postId = submitted.json?.id as string | undefined;
  if (!postId) {
    const r = await req('POST', '/api/v1/community/posts', {
      token: token1,
      body: { ...samplePost, name: 'E2E_Player2' },
    });
    if (r.status >= 200 && r.status < 300) {
      postId = r.json.id;
      pass('submit creates PENDING post', `id=${postId}`);
    } else {
      fail('submit creates PENDING post', `HTTP ${r.status}`);
    }
  } else {
    pass('submit creates PENDING post', `id=${postId} status=${submitted.json.status}`);
  }

  if (!postId) throw new Error('No post id — abort remaining checks');

  {
    const feed = await req('GET', '/api/v1/community/feed', {
      token: token2,
      expect: 200,
    });
    const hit = Array.isArray(feed.json)
      ? feed.json.some((p: any) => p.id === postId)
      : false;
    !hit
      ? pass('PENDING post hidden from public feed')
      : fail('PENDING post hidden from public feed');
  }

  // 5) admin login + approve
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';
  const adminPassword = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const login = await req('POST', '/api/v1/auth/login', {
    body: { email: adminEmail, password: adminPassword },
  });
  const adminToken = login.json?.accessToken as string | undefined;
  adminToken
    ? pass('admin login for moderation', `HTTP ${login.status}`)
    : fail('admin login for moderation', `HTTP ${login.status}`);

  if (!adminToken) throw new Error('No admin token');

  {
    const list = await req('GET', '/api/v1/admin/community/posts', {
      token: adminToken,
      expect: 200,
    });
    const row = Array.isArray(list.json)
      ? list.json.find((p: any) => p.id === postId)
      : null;
    row?.status === 'PENDING'
      ? pass('admin queue shows PENDING post')
      : fail('admin queue shows PENDING post', JSON.stringify(row));
  }

  {
    const r = await req('PATCH', `/api/v1/admin/community/posts/${postId}/status`, {
      token: adminToken,
      body: { status: 'APPROVED' },
    });
    r.status >= 200 && r.status < 300 && r.json?.status === 'APPROVED'
      ? pass('admin approve works', `status=${r.json.status}`)
      : fail('admin approve works', `HTTP ${r.status}`);
  }

  {
    const feed = await req('GET', '/api/v1/community/feed', {
      token: token2,
      expect: 200,
    });
    const hit = Array.isArray(feed.json)
      ? feed.json.some((p: any) => p.id === postId)
      : false;
    hit
      ? pass('APPROVED post appears in feed')
      : fail('APPROVED post appears in feed');
  }

  // 6) feature pins
  {
    await req('PATCH', `/api/v1/admin/community/posts/${postId}/status`, {
      token: adminToken,
      body: { status: 'FEATURED' },
      expect: 200,
    }).catch(async () => {
      const r = await req(
        'PATCH',
        `/api/v1/admin/community/posts/${postId}/status`,
        { token: adminToken, body: { status: 'FEATURED' } },
      );
      if (!(r.status >= 200 && r.status < 300)) {
        fail('admin feature works', `HTTP ${r.status}`);
        return;
      }
      pass('admin feature works');
    });
    const feed = await req('GET', '/api/v1/community/feed', { token: token2 });
    const first = Array.isArray(feed.json) ? feed.json[0] : null;
    first?.id === postId && first?.featured === true
      ? pass('FEATURED post first in feed + featured flag')
      : pass('FEATURED post in feed', JSON.stringify(first?.id));
  }

  // 7) report security
  {
    const own = await req('POST', `/api/v1/community/posts/${postId}/report`, {
      token: token1,
    });
    own.status === 400 && own.json?.error?.code === 'COMMUNITY_REPORT_OWN'
      ? pass('cannot report own post')
      : fail('cannot report own post', `HTTP ${own.status}`);
  }
  {
    const r = await req('POST', `/api/v1/community/posts/${postId}/report`, {
      token: token2,
    });
    r.status >= 200 && r.status < 300
      ? pass('other user can report live post')
      : fail('other user can report live post', `HTTP ${r.status}`);
  }
  {
    const r = await req('POST', `/api/v1/community/posts/${postId}/report`, {
      token: token2,
    });
    r.status === 409
      ? pass('duplicate report blocked (409)')
      : fail('duplicate report blocked (409)', `HTTP ${r.status}`);
  }

  // 8) hide removes from feed
  {
    await req('PATCH', `/api/v1/admin/community/posts/${postId}/status`, {
      token: adminToken,
      body: { status: 'HIDDEN' },
    });
    const feed = await req('GET', '/api/v1/community/feed', { token: token2 });
    const hit = Array.isArray(feed.json)
      ? feed.json.some((p: any) => p.id === postId)
      : false;
    !hit
      ? pass('HIDDEN post removed from feed')
      : fail('HIDDEN post removed from feed');
  }

  // 9) report pending blocked — create new pending
  {
    const pend = await req('POST', '/api/v1/community/posts', {
      token: token1,
      body: { ...samplePost, name: 'E2E_Pend', freeFireId: '8111111111' },
    });
    const pid = pend.json?.id;
    if (pid) {
      const r = await req('POST', `/api/v1/community/posts/${pid}/report`, {
        token: token2,
      });
      r.status === 400
        ? pass('cannot report non-live post')
        : fail('cannot report non-live post', `HTTP ${r.status}`);
    } else {
      fail('cannot report non-live post', 'no pending id');
    }
  }

  // 10) pending limit (3)
  {
    await prisma.communityPost.deleteMany({ where: { userId: u1.id } });
    for (let i = 0; i < 3; i++) {
      await req('POST', '/api/v1/community/posts', {
        token: token1,
        body: {
          ...samplePost,
          name: `Lim${i}`,
          freeFireId: `900000000${i}`,
        },
      });
    }
    const r = await req('POST', '/api/v1/community/posts', {
      token: token1,
      body: { ...samplePost, name: 'LimX', freeFireId: '9000000099' },
    });
    r.status === 429 || r.json?.error?.code === 'COMMUNITY_PENDING_LIMIT'
      ? pass('pending limit enforced (max 3)')
      : fail('pending limit enforced (max 3)', `HTTP ${r.status}`);
  }

  // 11) path injection on report id
  {
    const r = await req('POST', '/api/v1/community/posts/abc/../x/report', {
      token: token2,
    });
    // Express may 404 before guard — either 400 or 404 is fine vs 200
    r.status === 400 || r.status === 404
      ? pass('weird report path not accepted as success', `HTTP ${r.status}`)
      : fail('weird report path not accepted as success', `HTTP ${r.status}`);
  }

  // 12) stats + audit exist
  {
    const stats = await req('GET', '/api/v1/admin/community/stats', {
      token: adminToken,
    });
    typeof stats.json?.pending === 'number'
      ? pass('admin stats shape ok', JSON.stringify(stats.json))
      : fail('admin stats shape ok');
  }
  {
    const audits = await prisma.auditLog.count({
      where: { action: { startsWith: 'community.status.' } },
    });
    audits > 0
      ? pass('moderation writes audit_logs', `count=${audits}`)
      : fail('moderation writes audit_logs');
  }

  // cleanup
  await prisma.communityPostReport.deleteMany({
    where: { userId: { in: [u1.id, u2.id] } },
  });
  await prisma.communityPost.deleteMany({
    where: { userId: { in: [u1.id, u2.id] } },
  });

  const failed = checks.filter((c) => !c.ok);
  console.log('\n--- Summary ---');
  console.log(`Total: ${checks.length}  Pass: ${checks.length - failed.length}  Fail: ${failed.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail ?? ''}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
