/**
 * Scratch archive is server-owned. Phone delete must not be the only copy.
 */
import { PrismaClient, ScratchRollOutcome } from '@prisma/client';
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
  return { status: res.status, json };
}

function tokenFor(user: { id: string; email: string; tokenVersion: number }) {
  return jwt.sign(
    { sub: user.id, email: user.email, aud: 'user', tv: user.tokenVersion },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

async function main() {
  loadEnv();
  const day = new Date().toISOString().slice(0, 10);
  const prior = await prisma.scratchConfig.findUnique({ where: { id: 'default' } });

  const user = await prisma.user.upsert({
    where: { email: 'e2e.scratch.archive@example.com' },
    update: {
      isActive: true,
      coins: 5000,
      lastCheckinDay: day,
      streakDays: 7,
      walletFrozen: false,
    },
    create: {
      googleSub: 'e2e-scratch-archive-sub',
      email: 'e2e.scratch.archive@example.com',
      displayName: 'E2E Archive',
      isActive: true,
      coins: 5000,
      lastCheckinDay: day,
      streakDays: 7,
    },
  });
  const other = await prisma.user.upsert({
    where: { email: 'e2e.scratch.archive.other@example.com' },
    update: { isActive: true, coins: 0, lastCheckinDay: day, streakDays: 1 },
    create: {
      googleSub: 'e2e-scratch-archive-other',
      email: 'e2e.scratch.archive.other@example.com',
      displayName: 'E2E Archive Other',
      isActive: true,
      coins: 0,
      lastCheckinDay: day,
      streakDays: 1,
    },
  });

  await prisma.scratchRoll.deleteMany({
    where: {
      userId: user.id,
      dayKey: {
        in: [day, '1999-01-01', '1999-02-01', '1999-03-01', '1998-06-01', '1998-06-02', '1998-07-01', '1998-07-02', '1998-08-01'],
      },
    },
  });
  await prisma.walletLedger.deleteMany({
    where: {
      userId: user.id,
      idempotencyKey: { startsWith: `earn:scratch:${user.id}:${day}` },
    },
  });
  await prisma.scratchConfig.upsert({
    where: { id: 'default' },
    update: {
      coinsPercent: 100,
      redeemPercent: 0,
      coinAmount: 40,
      retentionDays: 30,
      showExpired: false,
    },
    create: {
      id: 'default',
      coinsPercent: 100,
      redeemPercent: 0,
      coinAmount: 40,
      retentionDays: 30,
      autoPurge: true,
      showExpired: false,
    },
  });

  const token = tokenFor(user);
  const otherToken = tokenFor(other);
  let createdPack = false;

  try {
    const anon = await req('GET', '/api/v1/scratch/history');
    anon.status === 401
      ? pass('history requires auth')
      : fail('history requires auth', `HTTP ${anon.status}`);

    const rolled = await req('POST', '/api/v1/scratch/roll', { token, body: {} });
    if (rolled.status !== 201 && rolled.status !== 200) {
      fail('daily roll', `HTTP ${rolled.status} ${JSON.stringify(rolled.json)}`);
    } else {
      pass('daily roll', rolled.json?.outcome);
    }

    const mine = await req('GET', '/api/v1/scratch/history', { token });
    const items: any[] = mine.json?.items ?? [];
    const gift = items.find(
      (row) =>
        row.kind === 'GIFT' &&
        row.title === rolled.json?.title &&
        row.coins === rolled.json?.coinDelta,
    );
    const giftShape =
      gift &&
      gift.code == null &&
      typeof gift.id === 'string' &&
      typeof gift.detail === 'string' &&
      typeof gift.rewardLabel === 'string' &&
      Number.isInteger(gift.coins) &&
      (gift.badge == null || typeof gift.badge === 'string') &&
      !Number.isNaN(Date.parse(gift.scratchedAt));
    mine.status === 200 && giftShape
      ? pass('history lists today roll', gift.id)
      : fail('history lists today roll', JSON.stringify(mine.json)?.slice(0, 400));

    const theirs = await req('GET', '/api/v1/scratch/history', { token: otherToken });
    const leaked = (theirs.json?.items ?? []).some((row: any) => row.id === gift?.id);
    theirs.status === 200 && !leaked
      ? pass('other user cannot see the roll')
      : fail('other user cannot see the roll', `HTTP ${theirs.status}`);

    const pending = await prisma.scratchRoll.create({
      data: {
        userId: user.id,
        dayKey: '1999-01-01',
        slot: 0,
        outcome: ScratchRollOutcome.COINS,
        coinDelta: 1,
        title: 'pending',
        rewardLabel: 'pending',
      },
    });
    const afterPending = await req('GET', '/api/v1/scratch/history', { token });
    const showsPending = (afterPending.json?.items ?? []).some(
      (row: any) => row.id === pending.id || row.title === 'pending',
    );
    !showsPending
      ? pass('pending rolls stay out of the archive')
      : fail('pending rolls stay out of the archive');

    const old = await prisma.scratchRoll.create({
      data: {
        userId: user.id,
        dayKey: '1999-02-01',
        slot: 0,
        outcome: ScratchRollOutcome.COINS,
        coinDelta: 7,
        title: 'expired-roll',
        rewardLabel: 'expired',
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
    });
    const hidden = await req('GET', '/api/v1/scratch/history', { token });
    const hiddenHit = (hidden.json?.items ?? []).some((row: any) => row.id === old.id);
    !hiddenHit
      ? pass('rolls past retention stay hidden')
      : fail('rolls past retention stay hidden');

    await prisma.scratchConfig.update({
      where: { id: 'default' },
      data: { showExpired: true },
    });
    const shown = await req('GET', '/api/v1/scratch/history', { token });
    const shownHit = (shown.json?.items ?? []).some((row: any) => row.id === old.id);
    shownHit
      ? pass('show expired reveals the old roll')
      : fail('show expired reveals the old roll');
    await prisma.scratchConfig.update({
      where: { id: 'default' },
      data: { showExpired: false },
    });

    const code = await prisma.redeemCode.create({
      data: {
        title: 'E2E archive code',
        type: 'CODE',
        valueLabel: 'E2E code',
        codeSecret: `e2e-archive-${user.id}`,
        stockLeft: 1,
        expiresLabel: 'test',
        redeemUrl: 'https://example.com/redeem',
      },
    });
    const claim = await prisma.redeemClaim.create({
      data: {
        userId: user.id,
        redeemCodeId: code.id,
        codeSecret: code.codeSecret,
      },
    });
    const linked = await prisma.scratchRoll.create({
      data: {
        userId: user.id,
        dayKey: '1999-03-01',
        slot: 0,
        outcome: ScratchRollOutcome.REDEEM,
        redeemCodeId: code.id,
        title: 'linked redeem roll',
        rewardLabel: 'E2E code',
      },
    });
    const soloCode = await prisma.redeemCode.create({
      data: {
        title: 'E2E solo claim',
        type: 'CODE',
        valueLabel: 'Solo',
        codeSecret: `e2e-archive-solo-${user.id}`,
        stockLeft: 1,
        expiresLabel: 'test',
        redeemUrl: 'https://example.com/redeem',
      },
    });
    const solo = await prisma.redeemClaim.create({
      data: {
        userId: user.id,
        redeemCodeId: soloCode.id,
        codeSecret: soloCode.codeSecret,
      },
    });
    const listed = await req('GET', '/api/v1/scratch/history', { token });
    const rows: any[] = listed.json?.items ?? [];
    const linkedRows = rows.filter(
      (row) => row.id === linked.id || row.id === claim.id || row.code === code.codeSecret,
    );
    const soloRow = rows.find((row) => row.id === solo.id);
    linkedRows.length === 1 &&
    linkedRows[0].kind === 'REDEEM' &&
    linkedRows[0].code === code.codeSecret &&
    soloRow?.kind === 'REDEEM' &&
    soloRow.code === soloCode.codeSecret
      ? pass('redeem roll and claim are listed once, solo claim stays')
      : fail(
          'redeem roll and claim are listed once, solo claim stays',
          JSON.stringify(linkedRows.concat(soloRow ?? [])),
        );

    await prisma.walletLedger.deleteMany({
      where: { idempotencyKey: `earn:milestone:${user.id}:7` },
    });
    await prisma.scratchArchiveEntry.deleteMany({
      where: { userId: user.id, sourceKey: 'milestone:7' },
    });
    const earned = await req('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'MILESTONE', milestoneDays: 7 },
    });
    const afterEarn = await req('GET', '/api/v1/scratch/history', { token });
    const milestones = (afterEarn.json?.items ?? []).filter(
      (row: any) => row.kind === 'MILESTONE' && String(row.title).startsWith('Day 7'),
    );
    earned.status === 201 || earned.status === 200
      ? milestones.length === 1
        ? pass('milestone earn is archived', milestones[0].title)
        : fail('milestone earn is archived', JSON.stringify(milestones))
      : fail('milestone earn', `HTTP ${earned.status} ${JSON.stringify(earned.json)}`);

    await prisma.scratchArchiveEntry.deleteMany({
      where: { userId: user.id, sourceKey: 'milestone:7' },
    });
    const repaired = await req('GET', '/api/v1/scratch/history', { token });
    const repairedRows = (repaired.json?.items ?? []).filter(
      (row: any) => row.kind === 'MILESTONE' && String(row.title).startsWith('Day 7'),
    );
    repairedRows.length === 1
      ? pass('ledger milestone is repaired into the archive')
      : fail('ledger milestone is repaired into the archive', String(repairedRows.length));

    const again = await req('POST', '/api/v1/economy/challenge/earn', {
      token,
      body: { kind: 'MILESTONE', milestoneDays: 7 },
    });
    const afterAgain = await req('GET', '/api/v1/scratch/history', { token });
    const still = (afterAgain.json?.items ?? []).filter(
      (row: any) => row.kind === 'MILESTONE' && String(row.title).startsWith('Day 7'),
    );
    (again.status === 200 || again.status === 201) && still.length === 1
      ? pass('milestone replay does not duplicate')
      : fail('milestone replay does not duplicate', `HTTP ${again.status} count=${still.length}`);

    const packExisted = await prisma.shopItem.findUnique({
      where: { id: 'pack_scratch_bonus' },
    });
    if (!packExisted) {
      createdPack = true;
      await prisma.shopItem.create({
        data: {
          id: 'pack_scratch_bonus',
          title: 'E2E scratch pack',
          subtitle: 'archive test',
          category: 'PACK',
          priceCoins: 10,
          rewardTag: '+1 scratch',
          oneTime: true,
          enabled: true,
        },
      });
    }
    const pack = await prisma.shopItem.findUnique({ where: { id: 'pack_scratch_bonus' } });
    if (!pack || !pack.enabled || pack.priceCoins <= 0) {
      fail('scratch pack exists', pack ? `enabled=${pack.enabled}` : 'missing');
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { coins: pack.priceCoins + 100, walletFrozen: false },
      });
      await prisma.walletLedger.deleteMany({
        where: { userId: user.id, reason: 'shop:pack_scratch_bonus' },
      });
      await prisma.scratchArchiveEntry.deleteMany({
        where: { userId: user.id, sourceKey: { startsWith: 'shop:pack_scratch_bonus' } },
      });
      const reqId = 'e2e-archive-shop-01';
      const bought = await req('POST', '/api/v1/economy/shop/purchase', {
        token,
        body: { itemId: 'pack_scratch_bonus', requestId: reqId },
      });
      const replay = await req('POST', '/api/v1/economy/shop/purchase', {
        token,
        body: { itemId: 'pack_scratch_bonus', requestId: reqId },
      });
      const shopHist = await req('GET', '/api/v1/scratch/history', { token });
      const shops = (shopHist.json?.items ?? []).filter((row: any) => row.kind === 'SHOP');
      const buyOk = bought.status === 200 || bought.status === 201;
      const replayOk =
        replay.status === 200 ||
        replay.status === 201 ||
        replay.json?.code === 'SHOP_ALREADY_OWNED' ||
        replay.json?.error?.code === 'SHOP_ALREADY_OWNED';
      buyOk && replayOk && shops.length === 1
        ? pass('scratch pack is archived once', shops[0].title)
        : fail(
            'scratch pack is archived once',
            `buy=${bought.status} replay=${replay.status} shops=${shops.length} ${JSON.stringify(replay.json)?.slice(0, 240)}`,
          );

      await prisma.scratchArchiveEntry.deleteMany({
        where: { userId: user.id, sourceKey: { startsWith: 'shop:pack_scratch_bonus' } },
      });
      const shopBack = await req('GET', '/api/v1/scratch/history', { token });
      const shopBackRows = (shopBack.json?.items ?? []).filter((row: any) => row.kind === 'SHOP');
      shopBackRows.length === 1
        ? pass('ledger scratch pack is repaired into the archive')
        : fail('ledger scratch pack is repaired into the archive', String(shopBackRows.length));

      if (createdPack) {
        await prisma.walletLedger.deleteMany({
          where: { userId: user.id, reason: 'shop:pack_scratch_bonus' },
        });
        await prisma.scratchArchiveEntry.deleteMany({
          where: { userId: user.id, sourceKey: { startsWith: 'shop:pack_scratch_bonus' } },
        });
        await prisma.shopItem.update({
          where: { id: 'pack_scratch_bonus' },
          data: { oneTime: false, priceCoins: 10 },
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { coins: 500 },
        });
        const firstId = 'e2e-archive-shop-11';
        const secondId = 'e2e-archive-shop-22';
        const buyA = await req('POST', '/api/v1/economy/shop/purchase', {
          token,
          body: { itemId: 'pack_scratch_bonus', requestId: firstId },
        });
        const buyB = await req('POST', '/api/v1/economy/shop/purchase', {
          token,
          body: { itemId: 'pack_scratch_bonus', requestId: secondId },
        });
        const buyA2 = await req('POST', '/api/v1/economy/shop/purchase', {
          token,
          body: { itemId: 'pack_scratch_bonus', requestId: firstId },
        });
        const stacked = await req('GET', '/api/v1/scratch/history', { token });
        const stackRows = (stacked.json?.items ?? []).filter((row: any) => row.kind === 'SHOP');
        (buyA.status === 200 || buyA.status === 201) &&
        (buyB.status === 200 || buyB.status === 201) &&
        (buyA2.status === 200 || buyA2.status === 201) &&
        stackRows.length === 2
          ? pass('repeat scratch-pack buys stay separate and replay does not duplicate')
          : fail(
              'repeat scratch-pack buys stay separate and replay does not duplicate',
              `a=${buyA.status} b=${buyB.status} replay=${buyA2.status} shops=${stackRows.length}`,
            );
      }
    }

    await prisma.shopItem.deleteMany({ where: { id: 'e2e_archive_side_item' } });
    await prisma.walletLedger.deleteMany({
      where: { userId: user.id, reason: 'shop:e2e_archive_side_item' },
    });
    const side = await prisma.shopItem.create({
      data: {
        id: 'e2e_archive_side_item',
        title: 'E2E side item',
        subtitle: 'not a scratch card',
        category: 'PACK',
        priceCoins: 5,
        rewardTag: 'side',
        oneTime: true,
        enabled: true,
      },
    });
    await prisma.user.update({ where: { id: user.id }, data: { coins: 500, isActive: true } });
    const beforeSide = await req('GET', '/api/v1/scratch/history', { token });
    const sideBuy = await req('POST', '/api/v1/economy/shop/purchase', {
      token,
      body: { itemId: side.id, requestId: 'e2e-archive-side-01' },
    });
    const afterSide = await req('GET', '/api/v1/scratch/history', { token });
    const sideShops = (afterSide.json?.items ?? []).filter((row: any) => row.kind === 'SHOP').length;
    const beforeShops = (beforeSide.json?.items ?? []).filter((row: any) => row.kind === 'SHOP').length;
    (sideBuy.status === 200 || sideBuy.status === 201) && sideShops === beforeShops
      ? pass('other shop purchases stay out of the scratch archive')
      : fail(
          'other shop purchases stay out of the scratch archive',
          `HTTP ${sideBuy.status} shops ${beforeShops}->${sideShops}`,
        );

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await prisma.user.update({
      where: { id: other.id },
      data: { lastCheckinDay: yesterday, isActive: true, walletFrozen: false },
    });
    const beforeCheckin = await req('GET', '/api/v1/scratch/history', { token: otherToken });
    const checkin = await req('POST', '/api/v1/economy/challenge/earn', {
      token: otherToken,
      body: { kind: 'CHECKIN' },
    });
    const afterCheckin = await req('GET', '/api/v1/scratch/history', { token: otherToken });
    const checkinSame =
      JSON.stringify(beforeCheckin.json?.items ?? []) ===
      JSON.stringify(afterCheckin.json?.items ?? []);
    (checkin.status === 200 || checkin.status === 201) && checkinSame
      ? pass('check-in does not add a scratched card')
      : fail(
          'check-in does not add a scratched card',
          `HTTP ${checkin.status} same=${checkinSame} ${JSON.stringify(checkin.json)?.slice(0, 180)}`,
        );

    const httpCode = await prisma.redeemCode.create({
      data: {
        title: 'E2E http claim',
        type: 'CODE',
        valueLabel: 'HTTP',
        codeSecret: `e2e-archive-http-${user.id}`,
        stockLeft: 1,
        mode: 'SINGLE',
        expiresLabel: 'test',
        redeemUrl: 'https://example.com/redeem',
      },
    });
    const claimed = await req('POST', `/api/v1/redeem/${httpCode.id}/claim`, { token });
    const claimedAgain = await req('POST', `/api/v1/redeem/${httpCode.id}/claim`, { token });
    const afterClaim = await req('GET', '/api/v1/scratch/history', { token });
    const httpRows = (afterClaim.json?.items ?? []).filter(
      (row: any) => row.code === httpCode.codeSecret,
    );
    (claimed.status === 200 || claimed.status === 201) &&
    (claimedAgain.status === 200 || claimedAgain.status === 201) &&
    httpRows.length === 1 &&
    httpRows[0].kind === 'REDEEM'
      ? pass('real redeem claim is archived once')
      : fail(
          'real redeem claim is archived once',
          `claim=${claimed.status} again=${claimedAgain.status} rows=${httpRows.length} ${JSON.stringify(claimed.json)?.slice(0, 180)}`,
        );

    const scratchCard = await prisma.redeemCode.create({
      data: {
        title: 'E2E scratch win',
        type: 'CODE',
        valueLabel: 'Scratch win',
        codeSecret: `e2e-archive-scratch-card-${user.id}`,
        stockLeft: 1,
        mode: 'SCRATCH_REWARD',
        codesPerWindow: 50,
        windowMinutes: 30,
        startsAt: new Date(Date.now() - 60_000),
        expiresLabel: 'test',
        redeemUrl: 'https://example.com/redeem',
        coinRewardMin: 1,
        coinRewardMax: 1,
      },
    });
    await prisma.redeemCodeSecret.create({
      data: {
        redeemCodeId: scratchCard.id,
        codeSecret: `e2e-archive-scratch-secret-${user.id}`,
      },
    });
    const scratched = await req('POST', `/api/v1/redeem/${scratchCard.id}/scratch`, {
      token,
      body: { attemptKey: 'e2e-archive-attempt-01' },
    });
    const scratchedReplay = await req('POST', `/api/v1/redeem/${scratchCard.id}/scratch`, {
      token,
      body: { attemptKey: 'e2e-archive-attempt-01' },
    });
    const afterScratch = await req('GET', '/api/v1/scratch/history', { token });
    const scratchRows = (afterScratch.json?.items ?? []).filter(
      (row: any) => row.code === `e2e-archive-scratch-secret-${user.id}`,
    );
    (scratched.status === 200 || scratched.status === 201) &&
    scratched.json?.code === `e2e-archive-scratch-secret-${user.id}` &&
    (scratchedReplay.status === 200 || scratchedReplay.status === 201) &&
    scratchRows.length === 1
      ? pass('redeem scratch win is archived once')
      : fail(
          'redeem scratch win is archived once',
          `HTTP ${scratched.status} replay=${scratchedReplay.status} rows=${scratchRows.length} ${JSON.stringify(scratched.json)?.slice(0, 240)}`,
        );

    const coinCard = await prisma.redeemCode.create({
      data: {
        title: 'E2E coin scratch',
        type: 'CODE',
        valueLabel: 'Coins only',
        codeSecret: `e2e-archive-coin-card-${user.id}`,
        stockLeft: 0,
        mode: 'SCRATCH_REWARD',
        codesPerWindow: 1,
        windowMinutes: 30,
        startsAt: new Date(Date.now() - 60_000),
        expiresLabel: 'test',
        redeemUrl: 'https://example.com/redeem',
        coinRewardMin: 4,
        coinRewardMax: 4,
      },
    });
    const idsBeforeCoin = new Set(
      ((await req('GET', '/api/v1/scratch/history', { token })).json?.items ?? []).map(
        (row: any) => row.id,
      ),
    );
    const coinScratch = await req('POST', `/api/v1/redeem/${coinCard.id}/scratch`, {
      token,
      body: { attemptKey: 'e2e-archive-coin-01' },
    });
    const afterCoin = await req('GET', '/api/v1/scratch/history', { token });
    const newCoinIds = (afterCoin.json?.items ?? []).filter((row: any) => !idsBeforeCoin.has(row.id));
    (coinScratch.status === 200 || coinScratch.status === 201) &&
    coinScratch.json?.code == null &&
    newCoinIds.length === 0
      ? pass('coin-only redeem scratch stays out of the archive')
      : fail(
          'coin-only redeem scratch stays out of the archive',
          `HTTP ${coinScratch.status} new=${newCoinIds.length} ${JSON.stringify(coinScratch.json)?.slice(0, 220)}`,
        );

    const dailyUser = await prisma.user.create({
      data: {
        googleSub: `e2e-archive-daily-${Date.now()}`,
        email: `e2e.scratch.archive.daily.${Date.now()}@example.com`,
        displayName: 'Daily redeem',
        isActive: true,
        coins: 20,
        lastCheckinDay: day,
        streakDays: 1,
      },
    });
    const blockers = await prisma.redeemCode.findMany({
      where: {
        status: 'ACTIVE',
        stockLeft: 1,
        OR: [{ coinCost: null }, { coinCost: 0 }],
      },
      select: { id: true, status: true },
    });
    await prisma.scratchConfig.update({
      where: { id: 'default' },
      data: { coinsPercent: 0, redeemPercent: 100, showExpired: false, retentionDays: 30 },
    });
    let dailyCodeSecret = '';
    try {
      if (blockers.length) {
        await prisma.redeemCode.updateMany({
          where: { id: { in: blockers.map((row) => row.id) } },
          data: { status: 'PAUSED' },
        });
      }
      const dailyCode = await prisma.redeemCode.create({
        data: {
          title: 'E2E daily redeem',
          type: 'CODE',
          valueLabel: 'Daily code',
          codeSecret: `e2e-archive-daily-${dailyUser.id}`,
          stockLeft: 1,
          mode: 'SINGLE',
          coinCost: 0,
          status: 'ACTIVE',
          expiresLabel: 'test',
          redeemUrl: 'https://example.com/redeem',
        },
      });
      dailyCodeSecret = dailyCode.codeSecret;
      const dailyToken = tokenFor(dailyUser);
      const dailyRedeem = await req('POST', '/api/v1/scratch/roll', {
        token: dailyToken,
        body: {},
      });
      const afterDaily = await req('GET', '/api/v1/scratch/history', { token: dailyToken });
      const dailyRows = (afterDaily.json?.items ?? []).filter(
        (row: any) => row.code === dailyCode.codeSecret,
      );
      dailyRedeem.json?.outcome === 'REDEEM' &&
      dailyRedeem.json?.code === dailyCode.codeSecret &&
      dailyRows.length === 1 &&
      dailyRows[0].kind === 'REDEEM' &&
      afterDaily.json?.items?.length === 1
        ? pass('daily redeem roll and its claim are one card')
        : fail(
            'daily redeem roll and its claim are one card',
            `outcome=${dailyRedeem.json?.outcome} rows=${dailyRows.length} total=${afterDaily.json?.items?.length} ${JSON.stringify(dailyRedeem.json)?.slice(0, 220)}`,
          );
    } finally {
      if (blockers.length) {
        await prisma.$transaction(
          blockers.map((row) =>
            prisma.redeemCode.update({
              where: { id: row.id },
              data: { status: row.status },
            }),
          ),
        );
      }
      await prisma.user.delete({ where: { id: dailyUser.id } }).catch(() => undefined);
      await prisma.scratchConfig.update({
        where: { id: 'default' },
        data: { coinsPercent: 100, redeemPercent: 0 },
      });
    }

    const newer = await prisma.scratchRoll.create({
      data: {
        userId: user.id,
        dayKey: '1998-06-01',
        slot: 0,
        outcome: ScratchRollOutcome.COINS,
        coinDelta: 2,
        title: 'sort-new',
        rewardLabel: 'new',
        createdAt: new Date(),
      },
    });
    const older = await prisma.scratchRoll.create({
      data: {
        userId: user.id,
        dayKey: '1998-06-02',
        slot: 0,
        outcome: ScratchRollOutcome.COINS,
        coinDelta: 2,
        title: 'sort-old',
        rewardLabel: 'old',
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    const sorted = await req('GET', '/api/v1/scratch/history', { token });
    const sortedItems: any[] = sorted.json?.items ?? [];
    const newAt = sortedItems.findIndex((row) => row.id === newer.id);
    const oldAt = sortedItems.findIndex((row) => row.id === older.id);
    newAt >= 0 && oldAt > newAt
      ? pass('archive is newest first')
      : fail('archive is newest first', `new=${newAt} old=${oldAt}`);

    const hiddenClaimCode = await prisma.redeemCode.create({
      data: {
        title: 'E2E old claim',
        type: 'CODE',
        valueLabel: 'Old',
        codeSecret: `e2e-archive-old-claim-${user.id}`,
        stockLeft: 0,
        status: 'EXHAUSTED',
        expiresLabel: 'test',
        redeemUrl: 'https://example.com/redeem',
      },
    });
    const oldClaim = await prisma.redeemClaim.create({
      data: {
        userId: user.id,
        redeemCodeId: hiddenClaimCode.id,
        codeSecret: hiddenClaimCode.codeSecret,
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
    });
    const oldMilestone = await prisma.scratchArchiveEntry.create({
      data: {
        userId: user.id,
        sourceKey: 'milestone:e2e-old',
        kind: 'MILESTONE',
        title: 'Day old',
        rewardLabel: '+1',
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.scratchConfig.update({
      where: { id: 'default' },
      data: { showExpired: false, retentionDays: 30 },
    });
    const hiddenExtra = await req('GET', '/api/v1/scratch/history', { token });
    const hiddenIds = new Set((hiddenExtra.json?.items ?? []).map((row: any) => row.id));
    !hiddenIds.has(oldClaim.id) && !hiddenIds.has(oldMilestone.id)
      ? pass('old claims and milestones stay hidden')
      : fail('old claims and milestones stay hidden');
    await prisma.scratchConfig.update({
      where: { id: 'default' },
      data: { showExpired: true },
    });
    const shownExtra = await req('GET', '/api/v1/scratch/history', { token });
    const shownIds = new Set((shownExtra.json?.items ?? []).map((row: any) => row.id));
    shownIds.has(oldClaim.id) && shownIds.has(oldMilestone.id)
      ? pass('show expired reveals old claims and milestones')
      : fail('show expired reveals old claims and milestones');
    await prisma.scratchConfig.update({
      where: { id: 'default' },
      data: { showExpired: false, retentionDays: 1 },
    });
    const withinDay = await prisma.scratchRoll.create({
      data: {
        userId: user.id,
        dayKey: '1998-07-01',
        slot: 0,
        outcome: ScratchRollOutcome.COINS,
        coinDelta: 1,
        title: 'within-day',
        rewardLabel: 'within',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    });
    const pastDay = await prisma.scratchRoll.create({
      data: {
        userId: user.id,
        dayKey: '1998-07-02',
        slot: 0,
        outcome: ScratchRollOutcome.COINS,
        coinDelta: 1,
        title: 'past-day',
        rewardLabel: 'past',
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
      },
    });
    const clamped = await req('GET', '/api/v1/scratch/history', { token });
    const clampIds = new Set((clamped.json?.items ?? []).map((row: any) => row.id));
    clamped.json?.retentionDays === 1 && clampIds.has(withinDay.id) && !clampIds.has(pastDay.id)
      ? pass('retention of 1 day hides older cards')
      : fail(
          'retention of 1 day hides older cards',
          `days=${clamped.json?.retentionDays} within=${clampIds.has(withinDay.id)} past=${clampIds.has(pastDay.id)}`,
        );
    await prisma.scratchConfig.update({
      where: { id: 'default' },
      data: { retentionDays: 9999, showExpired: false },
    });
    const yearOld = await prisma.scratchRoll.create({
      data: {
        userId: user.id,
        dayKey: '1998-08-01',
        slot: 0,
        outcome: ScratchRollOutcome.COINS,
        coinDelta: 1,
        title: 'year-old',
        rewardLabel: 'year',
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      },
    });
    const capped = await req('GET', '/api/v1/scratch/history', { token });
    const capIds = new Set((capped.json?.items ?? []).map((row: any) => row.id));
    capped.json?.retentionDays === 365 && !capIds.has(yearOld.id) && capIds.has(pastDay.id)
      ? pass('retention above 365 is capped and keeps a 36-hour card')
      : fail(
          'retention above 365 is capped and keeps a 36-hour card',
          `days=${capped.json?.retentionDays} year=${capIds.has(yearOld.id)} past=${capIds.has(pastDay.id)}`,
        );
    await prisma.scratchConfig.update({
      where: { id: 'default' },
      data: { retentionDays: 30, showExpired: false },
    });

    await prisma.scratchArchiveEntry.deleteMany({
      where: { userId: user.id, sourceKey: 'milestone:7' },
    });
    const parallel = await Promise.all(
      Array.from({ length: 8 }, () => req('GET', '/api/v1/scratch/history', { token })),
    );
    const milestoneRows = await prisma.scratchArchiveEntry.count({
      where: { userId: user.id, sourceKey: 'milestone:7' },
    });
    const parallelDay7 = (parallel[0].json?.items ?? []).filter(
      (row: any) => row.kind === 'MILESTONE' && String(row.title).startsWith('Day 7'),
    ).length;
    parallel.every((row) => row.status === 200) && milestoneRows === 1 && parallelDay7 === 1
      ? pass('parallel archive loads do not duplicate a milestone')
      : fail(
          'parallel archive loads do not duplicate a milestone',
          `rows=${milestoneRows} listed=${parallelDay7}`,
        );

    const blank = await prisma.user.create({
      data: {
        googleSub: `e2e-archive-blank-${Date.now()}`,
        email: `e2e.scratch.archive.blank.${Date.now()}@example.com`,
        displayName: 'Blank',
      },
    });
    const blankToken = tokenFor(blank);
    const blankHist = await req('GET', '/api/v1/scratch/history', { token: blankToken });
    blankHist.status === 200 &&
    Array.isArray(blankHist.json?.items) &&
    blankHist.json.items.length === 0
      ? pass('a user with no scratches gets an empty archive')
      : fail('a user with no scratches gets an empty archive', JSON.stringify(blankHist.json)?.slice(0, 180));
    await prisma.user.delete({ where: { id: blank.id } });

    const badToken = tokenFor({ id: user.id, email: user.email, tokenVersion: user.tokenVersion + 9 });
    const revoked = await req('GET', '/api/v1/scratch/history', { token: badToken });
    revoked.status === 401
      ? pass('revoked token cannot read the archive')
      : fail('revoked token cannot read the archive', `HTTP ${revoked.status}`);

    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    const suspended = await req('GET', '/api/v1/scratch/history', { token });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
    suspended.status === 401 && suspended.json?.error?.code === 'AUTH_INVALID'
      ? pass('suspended user cannot read the archive')
      : fail('suspended user cannot read the archive', `HTTP ${suspended.status} ${JSON.stringify(suspended.json)?.slice(0, 160)}`);

    const otherRaw = JSON.stringify(
      (await req('GET', '/api/v1/scratch/history', { token: otherToken })).json ?? {},
    );
    const secrets = [
      httpCode.codeSecret,
      `e2e-archive-scratch-secret-${user.id}`,
      dailyCodeSecret,
      hiddenClaimCode.codeSecret,
    ].filter((secret) => secret.length > 0);
    secrets.every((secret) => !otherRaw.includes(secret))
      ? pass('another user cannot see these codes')
      : fail('another user cannot see these codes');

    const doomed = await prisma.user.create({
      data: {
        googleSub: `e2e-archive-delete-${Date.now()}`,
        email: `e2e.scratch.archive.delete.${Date.now()}@example.com`,
        displayName: 'Delete me',
      },
    });
    await prisma.scratchArchiveEntry.create({
      data: {
        userId: doomed.id,
        sourceKey: 'milestone:7',
        kind: 'MILESTONE',
        title: 'Day 7',
        rewardLabel: '+1',
      },
    });
    await prisma.user.delete({ where: { id: doomed.id } });
    const left = await prisma.scratchArchiveEntry.count({ where: { userId: doomed.id } });
    left === 0
      ? pass('deleting the user removes archive rows')
      : fail('deleting the user removes archive rows', String(left));
  } finally {
    if (prior) {
      await prisma.scratchConfig.update({
        where: { id: 'default' },
        data: {
          coinsPercent: prior.coinsPercent,
          redeemPercent: prior.redeemPercent,
          coinAmount: prior.coinAmount,
          retentionDays: prior.retentionDays,
          showExpired: prior.showExpired,
          autoPurge: prior.autoPurge,
        },
      });
    }
    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
    await prisma.redeemCode.deleteMany({
      where: { codeSecret: { startsWith: 'e2e-archive-' } },
    });
    await prisma.scratchArchiveEntry.deleteMany({
      where: { userId: user.id, sourceKey: 'milestone:e2e-old' },
    });
    await prisma.walletLedger.deleteMany({
      where: { userId: user.id, reason: 'shop:e2e_archive_side_item' },
    });
    await prisma.shopItem.deleteMany({ where: { id: 'e2e_archive_side_item' } });
    if (createdPack) {
      await prisma.walletLedger.deleteMany({
        where: { userId: user.id, reason: 'shop:pack_scratch_bonus' },
      });
      await prisma.shopItem.deleteMany({ where: { id: 'pack_scratch_bonus' } });
    }
    await prisma.$disconnect();
  }

  const bad = checks.filter((c) => !c.ok);
  console.log(bad.length === 0 ? `ALL_PASS ${checks.length}` : `FAILED ${bad.length}/${checks.length}`);
  if (bad.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
