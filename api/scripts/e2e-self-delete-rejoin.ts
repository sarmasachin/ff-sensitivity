/**
 * Self-delete can sign in again. Admin suspend and admin Gmail-ban stay blocked.
 * Hits the local API for delete/JWT, and the real UserAuthService for Google login.
 */
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

const API = process.env.API_BASE ?? 'http://127.0.0.1:4000';

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

loadEnv();

type GooglePayload = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

let googlePayload: GooglePayload | null = null;
OAuth2Client.prototype.verifyIdToken = async function () {
  if (!googlePayload) throw new Error('missing test google payload');
  return { getPayload: () => googlePayload };
};

const prisma = new PrismaClient();
const checks: { name: string; ok: boolean; detail?: string }[] = [];
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
  const cookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  let accessToken: string | undefined = json?.accessToken;
  if (!accessToken) {
    for (const c of cookies) {
      const m = /^access_token=([^;]+)/.exec(c);
      if (m) accessToken = decodeURIComponent(m[1]);
    }
  }
  return { status: res.status, json, accessToken };
}

function userToken(id: string, email: string, tv: number) {
  return jwt.sign(
    { sub: id, email, aud: 'user', tv },
    process.env.JWT_USER_SECRET!,
    { expiresIn: '1h' },
  );
}

async function main() {
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../src/app.module');
  const { UserAuthService } = require('../src/user-auth/user-auth.service');
  const { UserProfileService } = require('../src/user-profile/user-profile.service');
  const { AppError } = require('../src/common/errors/app-error');

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const auth = app.get(UserAuthService);
  const profile = app.get(UserProfileService);
  const stamp = Date.now().toString(36);
  const ids: string[] = [];
  let redeemId: string | null = null;

  async function login(sub: string, email: string, name: string) {
    googlePayload = {
      sub,
      email,
      email_verified: true,
      name,
      picture: 'https://example.com/a.png',
    };
    try {
      const body = await auth.loginWithGoogle({ idToken: 'e2e-id-token' });
      return { ok: true as const, body };
    } catch (e) {
      const code = e instanceof AppError ? e.code : 'THROW';
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false as const, code, message };
    }
  }

  try {
    const code = await prisma.redeemCode.create({
      data: {
        title: 'e2e rejoin',
        type: 'DIAMOND',
        valueLabel: '1',
        codeSecret: `e2e-rejoin-${stamp}`,
        stockLeft: 1,
        expiresLabel: 'none',
        redeemUrl: 'https://example.com/redeem',
      },
    });
    redeemId = code.id;

    const self = await prisma.user.create({
      data: {
        googleSub: `e2e-rejoin-self-${stamp}`,
        email: `e2e.rejoin.self.${stamp}@example.com`,
        displayName: 'Before Delete',
        googleName: 'Before Delete',
        ffUid: '999',
        playRole: 'Rusher',
        region: 'India',
        coins: 40,
        streakDays: 3,
        isActive: true,
        googleBanned: false,
      },
    });
    ids.push(self.id);
    await prisma.redeemCodeVote.create({
      data: { userId: self.id, redeemCodeId: code.id, worked: true },
    });
    await prisma.redeemCodeComment.create({
      data: {
        userId: self.id,
        redeemCodeId: code.id,
        authorName: 'Before',
        body: 'old comment',
      },
    });
    await prisma.scratchArchiveEntry.create({
      data: {
        userId: self.id,
        sourceKey: `e2e:${stamp}`,
        kind: 'GIFT',
        title: 'old card',
        rewardLabel: '+40',
        coins: 40,
      },
    });
    await prisma.sensitivityCompare.create({
      data: {
        userId: self.id,
        deviceLabel: 'Phone',
        fingers: '4',
        role: 'Rusher',
        dpiPreference: 'Default',
        screenGuard: 'No',
        suggestedGeneral: 80,
        suggestedRedDot: 70,
        suggestedScope2x: 60,
        suggestedScope4x: 50,
        suggestedSniper: 40,
        suggestedFreeLook: 30,
        suggestedFireButton: 20,
        actualGeneral: 81,
        actualRedDot: 70,
        actualScope2x: 60,
        actualScope4x: 50,
        actualSniper: 40,
        actualFreeLook: 30,
        actualFireButton: 20,
        feedback: 'perfect',
      },
    });

    const tok = userToken(self.id, self.email, self.tokenVersion);
    const deleted = await req('POST', '/api/v1/user/profile/delete', { token: tok });
    deleted.status === 200 && deleted.json?.ok === true
      ? pass('self_delete_http', `status=${deleted.status}`)
      : fail('self_delete_http', `${deleted.status} ${JSON.stringify(deleted.json)}`);

    const wiped = await prisma.user.findUnique({ where: { id: self.id } });
    wiped &&
    wiped.isActive === false &&
    wiped.googleBanned === false &&
    wiped.dataDeletedAt &&
    wiped.coins === 0 &&
    wiped.ffUid === '' &&
    wiped.displayName === 'Deleted user'
      ? pass('self_delete_flags')
      : fail('self_delete_flags', JSON.stringify(wiped));

    const [votes, comments, archive, compares] = await Promise.all([
      prisma.redeemCodeVote.count({ where: { userId: self.id } }),
      prisma.redeemCodeComment.count({ where: { userId: self.id } }),
      prisma.scratchArchiveEntry.count({ where: { userId: self.id } }),
      prisma.sensitivityCompare.count({ where: { userId: self.id } }),
    ]);
    votes === 0 && comments === 0 && archive === 0 && compares === 0
      ? pass('self_delete_wipes_new_tables', `v${votes} c${comments} a${archive} cmp${compares}`)
      : fail('self_delete_wipes_new_tables', `v${votes} c${comments} a${archive} cmp${compares}`);

    const stale = await req('GET', '/api/v1/economy/wallet', { token: tok });
    stale.status === 401
      ? pass('old_jwt_rejected_after_delete')
      : fail('old_jwt_rejected_after_delete', `status=${stale.status}`);

    const again = await req('POST', '/api/v1/user/profile/delete', { token: tok });
    again.status === 401
      ? pass('deleted_session_cannot_delete_again')
      : fail('deleted_session_cannot_delete_again', `status=${again.status}`);

    const rejoined = await login(
      self.googleSub,
      self.email,
      'Rejoin Player',
    );
    const row = await prisma.user.findUnique({ where: { id: self.id } });
    rejoined.ok &&
    rejoined.body.user.id === self.id &&
    rejoined.body.user.displayName === 'Rejoin Player' &&
    rejoined.body.user.coins === 0 &&
    row?.isActive === true &&
    row.googleBanned === false &&
    row.dataDeletedAt === null &&
    row.ffUid === '' &&
    row.coins === 0
      ? pass('same_google_id_can_login', `id=${rejoined.ok ? rejoined.body.user.id : 'no'}`)
      : fail(
          'same_google_id_can_login',
          JSON.stringify({ rejoined, active: row?.isActive, deleted: row?.dataDeletedAt, coins: row?.coins }),
        );

    if (rejoined.ok) {
      const wallet = await req('GET', '/api/v1/economy/wallet', {
        token: rejoined.body.accessToken,
      });
      wallet.status === 200 && wallet.json?.coins === 0
        ? pass('rejoin_token_wallet', `coins=${wallet.json?.coins}`)
        : fail('rejoin_token_wallet', `${wallet.status} ${JSON.stringify(wallet.json)}`);

      const profile = await req('GET', '/api/v1/user/profile', {
        token: rejoined.body.accessToken,
      });
      profile.status === 200 && profile.json?.profile?.displayName === 'Rejoin Player'
        ? pass('rejoin_profile')
        : fail('rejoin_profile', `${profile.status} ${JSON.stringify(profile.json)}`);
    } else {
      fail('rejoin_token_wallet', 'login failed');
      fail('rejoin_profile', 'login failed');
    }

    await prisma.user.update({ where: { id: self.id }, data: { coins: 9 } });
    const second = await login(self.googleSub, self.email, 'Rejoin Player');
    const kept = await prisma.user.findUnique({ where: { id: self.id } });
    second.ok && kept?.coins === 9 && kept.isActive === true
      ? pass('second_login_keeps_coins')
      : fail('second_login_keeps_coins', `coins=${kept?.coins} ok=${second.ok}`);

    const suspended = await prisma.user.create({
      data: {
        googleSub: `e2e-rejoin-sus-${stamp}`,
        email: `e2e.rejoin.sus.${stamp}@example.com`,
        displayName: 'Suspended',
        isActive: false,
        googleBanned: false,
        dataDeletedAt: null,
        lastLoginAt: new Date('2020-01-01T00:00:00.000Z'),
        coins: 5,
      },
    });
    ids.push(suspended.id);
    const susLogin = await login(suspended.googleSub, suspended.email, 'Nope');
    const susRow = await prisma.user.findUnique({ where: { id: suspended.id } });
    !susLogin.ok &&
    susLogin.code === 'AUTH_SUSPENDED' &&
    susRow?.isActive === false &&
    susRow.coins === 5 &&
    susRow.lastLoginAt?.toISOString() === '2020-01-01T00:00:00.000Z'
      ? pass('admin_suspend_still_blocked')
      : fail('admin_suspend_still_blocked', JSON.stringify({ susLogin, last: susRow?.lastLoginAt, coins: susRow?.coins }));

    const banned = await prisma.user.create({
      data: {
        googleSub: `e2e-rejoin-ban-${stamp}`,
        email: `e2e.rejoin.ban.${stamp}@example.com`,
        displayName: 'Banned',
        isActive: false,
        googleBanned: true,
        dataDeletedAt: new Date(),
        coins: 0,
        lastLoginAt: new Date('2020-01-02T00:00:00.000Z'),
      },
    });
    ids.push(banned.id);
    const banLogin = await login(banned.googleSub, banned.email, 'Banned');
    const banRow = await prisma.user.findUnique({ where: { id: banned.id } });
    !banLogin.ok &&
    banLogin.code === 'AUTH_SUSPENDED' &&
    banRow?.googleBanned === true &&
    banRow.isActive === false &&
    banRow.dataDeletedAt
      ? pass('admin_gmail_ban_still_blocked')
      : fail('admin_gmail_ban_still_blocked', JSON.stringify(banLogin));

    const active = await prisma.user.create({
      data: {
        googleSub: `e2e-rejoin-ok-${stamp}`,
        email: `e2e.rejoin.ok.${stamp}@example.com`,
        displayName: 'Active',
        isActive: true,
        coins: 20,
        ffUid: '123',
      },
    });
    ids.push(active.id);
    const okLogin = await login(active.googleSub, active.email, 'Still Active');
    const okRow = await prisma.user.findUnique({ where: { id: active.id } });
    okLogin.ok && okRow?.coins === 20 && okRow.ffUid === '123' && okRow.isActive === true
      ? pass('normal_login_does_not_wipe')
      : fail('normal_login_does_not_wipe', `coins=${okRow?.coins} uid=${okRow?.ffUid}`);

    googlePayload = {
      sub: `e2e-rejoin-bad-${stamp}`,
      email: `e2e.rejoin.bad.${stamp}@example.com`,
      email_verified: false,
      name: 'Bad',
    };
    let unverified = '';
    try {
      await auth.loginWithGoogle({ idToken: 'e2e-id-token' });
      unverified = 'allowed';
    } catch (e) {
      unverified = e instanceof AppError ? e.code : 'THROW';
    }
    unverified === 'AUTH_GOOGLE_INVALID'
      ? pass('unverified_email_rejected')
      : fail('unverified_email_rejected', unverified);

    const fake = await req('POST', '/api/v1/user/auth/google', {
      body: { idToken: 'not-a-real-google-token' },
    });
    fake.status === 401 && fake.json?.error?.code === 'AUTH_GOOGLE_INVALID'
      ? pass('live_api_rejects_fake_google_token')
      : fail('live_api_rejects_fake_google_token', `${fake.status} ${JSON.stringify(fake.json)}`);

    const adminLogin = await req('POST', '/api/v1/auth/login', {
      body: {
        email: process.env.SUPERADMIN_EMAIL,
        password: process.env.SUPERADMIN_PASSWORD,
      },
    });
    const adminTok = adminLogin.accessToken;
    if (!adminTok) {
      fail('admin_login', `${adminLogin.status}`);
    } else {
      pass('admin_login');
      const pending = await prisma.user.create({
        data: {
          googleSub: `e2e-rejoin-pend-${stamp}`,
          email: `e2e.rejoin.pend.${stamp}@example.com`,
          displayName: 'Pending',
          isActive: true,
          coins: 1,
        },
      });
      ids.push(pending.id);
      await profile.deleteAccount(pending.id);
      const restore = await req('POST', `/api/v1/admin/users/${pending.id}/status`, {
        token: adminTok,
        body: { action: 'restore' },
      });
      restore.status === 409 &&
      String(restore.json?.error?.message ?? '').includes('sign in again')
        ? pass('admin_restore_tells_user_can_sign_in')
        : fail(
            'admin_restore_tells_user_can_sign_in',
            `${restore.status} ${JSON.stringify(restore.json)}`,
          );

      const victim = await prisma.user.create({
        data: {
          googleSub: `e2e-rejoin-adm-${stamp}`,
          email: `e2e.rejoin.adm.${stamp}@example.com`,
          displayName: 'Victim',
          isActive: true,
          coins: 8,
        },
      });
      ids.push(victim.id);
      await prisma.scratchArchiveEntry.create({
        data: {
          userId: victim.id,
          sourceKey: `e2e-admin:${stamp}`,
          kind: 'GIFT',
          title: 'admin wipe',
          rewardLabel: '+8',
          coins: 8,
        },
      });
      const sus = await req('POST', `/api/v1/admin/users/${victim.id}/status`, {
        token: adminTok,
        body: { action: 'suspend' },
      });
      const del = await req('POST', `/api/v1/admin/users/${victim.id}/delete`, {
        token: adminTok,
      });
      const afterBan = await prisma.user.findUnique({ where: { id: victim.id } });
      const left = await prisma.scratchArchiveEntry.count({ where: { userId: victim.id } });
      const blocked = await login(victim.googleSub, victim.email, 'Victim');
      (sus.status === 200 || sus.status === 201) &&
      (del.status === 200 || del.status === 201) &&
      afterBan?.googleBanned === true &&
      afterBan.isActive === false &&
      left === 0 &&
      !blocked.ok &&
      blocked.code === 'AUTH_SUSPENDED'
        ? pass('admin_delete_bans_gmail_and_wipes')
        : fail(
            'admin_delete_bans_gmail_and_wipes',
            JSON.stringify({
              sus: sus.status,
              del: del.status,
              banned: afterBan?.googleBanned,
              left,
              blocked,
            }),
          );
    }
  } finally {
    googlePayload = null;
    if (ids.length) {
      await prisma.redeemCodeVote.deleteMany({ where: { userId: { in: ids } } });
      await prisma.redeemCodeComment.deleteMany({ where: { userId: { in: ids } } });
      await prisma.scratchArchiveEntry.deleteMany({ where: { userId: { in: ids } } });
      await prisma.sensitivityCompare.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (redeemId) {
      await prisma.redeemCode.deleteMany({ where: { id: redeemId } });
    }
    await app.close();
    await prisma.$disconnect();
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
