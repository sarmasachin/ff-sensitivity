/**
 * Redeem LIKE/DISLIKE is one server vote per user.
 * Both the card and the comments page read the same counts.
 * Run: npx ts-node --transpile-only scripts/e2e-redeem-vote.ts
 */
import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
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

const checks: { name: string; ok: boolean }[] = [];
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

function item(json: any, id: string) {
  return (json?.items ?? []).find((row: any) => row.id === id);
}

async function main() {
  loadEnv();
  const secret = process.env.JWT_USER_SECRET;
  if (!secret) {
    fail('bootstrap', 'JWT_USER_SECRET missing');
    process.exit(1);
  }
  const stamp = Date.now();
  const code = await prisma.redeemCode.create({
    data: {
      title: `E2E Vote ${stamp}`,
      type: 'GOOGLE_PLAY',
      valueLabel: 'Test',
      codeSecret: `VOTE-${stamp}`,
      stockLeft: 1,
      expiresLabel: 'E2E',
      redeemUrl: 'https://play.google.com/redeem',
    },
  });
  const a = await prisma.user.create({
    data: {
      email: `e2e.vote.a.${stamp}@example.com`,
      displayName: 'Vote A',
      googleSub: `sub_vote_a_${stamp}`,
      coins: 0,
      isActive: true,
    },
  });
  const b = await prisma.user.create({
    data: {
      email: `e2e.vote.b.${stamp}@example.com`,
      displayName: 'Vote B',
      googleSub: `sub_vote_b_${stamp}`,
      coins: 0,
      isActive: true,
    },
  });
  const tok = (user: { id: string; email: string; tokenVersion: number }) =>
    jwt.sign({ sub: user.id, email: user.email, aud: 'user', tv: user.tokenVersion }, secret, {
      expiresIn: '1h',
    });
  const c = await prisma.user.create({
    data: {
      email: `e2e.vote.c.${stamp}@example.com`,
      displayName: 'Vote C',
      googleSub: `sub_vote_c_${stamp}`,
      coins: 0,
      isActive: true,
    },
  });
  const tokA = tok(a);
  const tokB = tok(b);
  const tokC = tok(c);

  try {
    const anon = await req('POST', `/api/v1/redeem/${code.id}/vote`, {
      body: { worked: true },
    });
    anon.status === 401
      ? pass('vote_requires_auth', String(anon.status))
      : fail('vote_requires_auth', JSON.stringify(anon.json));

    const badBody = await req('POST', `/api/v1/redeem/${code.id}/vote`, {
      token: tokA,
      body: { worked: 'yes' },
    });
    badBody.status === 400
      ? pass('vote_rejects_non_boolean')
      : fail('vote_rejects_non_boolean', JSON.stringify(badBody.json));

    const missing = await req('POST', `/api/v1/redeem/not-a-real-code/vote`, {
      token: tokA,
      body: { worked: true },
    });
    missing.status === 404 && missing.json?.error?.code === 'REDEEM_NOT_FOUND'
      ? pass('missing_code_404')
      : fail('missing_code_404', JSON.stringify(missing.json));

    const empty = await req('GET', '/api/v1/redeem/catalog', { token: tokC });
    const emptyHit = item(empty.json, code.id);
    emptyHit?.yesCount === 0 && emptyHit?.noCount === 0 && emptyHit?.myVote == null
      ? pass('fresh_counts_zero')
      : fail('fresh_counts_zero', JSON.stringify(emptyHit));

    const like = await req('POST', `/api/v1/redeem/${code.id}/vote`, {
      token: tokA,
      body: { worked: true },
    });
    like.status < 300 && like.json?.worked === true && like.json?.yesCount === 1 && like.json?.noCount === 0
      ? pass('a_likes', JSON.stringify(like.json))
      : fail('a_likes', JSON.stringify(like.json));

    const seen = await req('GET', '/api/v1/redeem/catalog', { token: tokB });
    const seenHit = item(seen.json, code.id);
    seen.status === 200 &&
    seenHit?.yesCount === 1 &&
    seenHit?.noCount === 0 &&
    seenHit?.myVote == null
      ? pass('b_sees_a_like')
      : fail('b_sees_a_like', JSON.stringify(seenHit));

    const dislike = await req('POST', `/api/v1/redeem/${code.id}/vote`, {
      token: tokB,
      body: { worked: false },
    });
    dislike.status < 300 &&
    dislike.json?.worked === false &&
    dislike.json?.yesCount === 1 &&
    dislike.json?.noCount === 1
      ? pass('b_dislikes', JSON.stringify(dislike.json))
      : fail('b_dislikes', JSON.stringify(dislike.json));

    const bCat = await req('GET', '/api/v1/redeem/catalog', { token: tokB });
    const bHit = item(bCat.json, code.id);
    bHit?.myVote === false && bHit?.yesCount === 1 && bHit?.noCount === 1
      ? pass('b_my_vote_is_dislike')
      : fail('b_my_vote_is_dislike', JSON.stringify(bHit));

    const again = await req('POST', `/api/v1/redeem/${code.id}/vote`, {
      token: tokA,
      body: { worked: false },
    });
    const after = await req('GET', '/api/v1/redeem/catalog', { token: tokA });
    const afterHit = item(after.json, code.id);
    again.status < 300 &&
    again.json?.worked === true &&
    again.json?.yesCount === 1 &&
    again.json?.noCount === 1 &&
    afterHit?.myVote === true &&
    afterHit?.yesCount === 1 &&
    afterHit?.noCount === 1
      ? pass('a_locked_on_like')
      : fail('a_locked_on_like', JSON.stringify({ again: again.json, afterHit }));

    const comment = await req('POST', `/api/v1/redeem/${code.id}/comments`, {
      token: tokC,
      body: { name: 'Cee', text: 'Still deciding.' },
    });
    const afterComment = await req('GET', '/api/v1/redeem/catalog', { token: tokC });
    const commentHit = item(afterComment.json, code.id);
    comment.status < 300 &&
    commentHit?.yesCount === 1 &&
    commentHit?.noCount === 1 &&
    commentHit?.myVote == null
      ? pass('comment_does_not_change_vote')
      : fail('comment_does_not_change_vote', JSON.stringify({ comment: comment.json, commentHit }));

    const cSeen = await req('GET', '/api/v1/redeem/catalog', { token: tokC });
    const cHit = item(cSeen.json, code.id);
    cHit?.yesCount === 1 && cHit?.noCount === 1 && cHit?.myVote == null
      ? pass('c_sees_both_counts')
      : fail('c_sees_both_counts', JSON.stringify(cHit));

    const racers = await Promise.all(
      Array.from({ length: 6 }, () =>
        req('POST', `/api/v1/redeem/${code.id}/vote`, {
          token: tokA,
          body: { worked: false },
        }),
      ),
    );
    const rows = await prisma.redeemCodeVote.count({
      where: { userId: a.id, redeemCodeId: code.id },
    });
    racers.every((r) => r.status < 300 && r.json?.yesCount === 1 && r.json?.noCount === 1) && rows === 1
      ? pass('parallel_same_user_stays_one')
      : fail('parallel_same_user_stays_one', JSON.stringify({ rows, sample: racers[0]?.json }));

    const extras = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        prisma.user.create({
          data: {
            email: `e2e.vote.x.${stamp}.${i}@example.com`,
            displayName: `Vote X${i}`,
            googleSub: `sub_vote_x_${stamp}_${i}`,
            coins: 0,
            isActive: true,
          },
        }),
      ),
    );
    const burst = await Promise.all(
      extras.map((user) =>
        req('POST', `/api/v1/redeem/${code.id}/vote`, {
          token: tok(user),
          body: { worked: true },
        }),
      ),
    );
    const crowd = await req('GET', '/api/v1/redeem/catalog', { token: tokC });
    const crowdHit = item(crowd.json, code.id);
    burst.every((r) => r.status < 300) && crowdHit?.yesCount === 5 && crowdHit?.noCount === 1
      ? pass('four_more_likes', `yes=${crowdHit?.yesCount} no=${crowdHit?.noCount}`)
      : fail('four_more_likes', JSON.stringify({ burst: burst.map((r) => r.json), crowdHit }));
    await prisma.user.deleteMany({ where: { id: { in: extras.map((u) => u.id) } } });

    await prisma.redeemCode.delete({ where: { id: code.id } });
    const leftover = await prisma.redeemCodeVote.count({ where: { redeemCodeId: code.id } });
    const commentsLeft = await prisma.redeemCodeComment.count({ where: { redeemCodeId: code.id } });
    leftover === 0 && commentsLeft === 0
      ? pass('delete_card_clears_votes_and_comments', `votes=${leftover} comments=${commentsLeft}`)
      : fail('delete_card_clears_votes_and_comments', `votes=${leftover} comments=${commentsLeft}`);
  } finally {
    await prisma.user.delete({ where: { id: c.id } }).catch(() => undefined);
    await prisma.redeemCode.delete({ where: { id: code.id } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  }

  const bad = checks.filter((c) => !c.ok);
  console.log(bad.length ? `FAIL ${bad.length}/${checks.length}` : `ALL_PASS ${checks.length}`);
  if (bad.length) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
