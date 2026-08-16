/**
 * Support tickets admin + user e2e / security (local Postgres).
 */
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import {
  checks,
  fail,
  loadEnv,
  pass,
  prisma,
  req,
} from './e2e-support-lib';

async function main() {
  loadEnv();
  const userSecret = process.env.JWT_USER_SECRET!;
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';

  const user = await prisma.user.upsert({
    where: { email: 'e2e.support@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-support-sub',
      email: 'e2e.support@example.com',
      displayName: 'E2E Support',
      isActive: true,
    },
  });
  const other = await prisma.user.upsert({
    where: { email: 'e2e.support.other@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-support-other',
      email: 'e2e.support.other@example.com',
      displayName: 'E2E Other',
      isActive: true,
    },
  });
  await prisma.supportMessage.deleteMany({
    where: { thread: { userId: { in: [user.id, other.id] } } },
  });
  await prisma.supportThread.deleteMany({
    where: { userId: { in: [user.id, other.id] } },
  });

  const userTok = jwt.sign(
    { sub: user.id, email: user.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );
  const otherTok = jwt.sign(
    { sub: other.id, email: other.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );

  {
    const r = await req('GET', '/api/v1/support/thread');
    r.status === 401
      ? pass('user_auth_required')
      : fail('user_auth_required', `status=${r.status}`);
  }
  {
    const r = await req('GET', '/api/v1/admin/support');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/support/thread', { token: userTok });
    r.status === 200 && r.json?.thread === null
      ? pass('empty_thread')
      : fail('empty_thread', JSON.stringify(r.json));
  }

  let threadId = '';
  {
    const r = await req('POST', '/api/v1/support/thread', {
      token: userTok,
      body: {
        name: 'Spoofed Name',
        email: 'victim@other.com',
        subject: 'BUG',
        message: 'Quiz freeze on wrong answer.',
        appVersion: '2.4.1',
        deviceLabel: 'Pixel 7 · Android 14',
      },
    });
    if (r.status === 201 || r.status === 200) {
      threadId = r.json?.id ?? '';
      const bound =
        threadId &&
        r.json?.email === user.email &&
        r.json?.name === user.displayName;
      bound
        ? pass('start_thread_identity_bound', threadId)
        : fail(
            'start_thread_identity_bound',
            `email=${r.json?.email} name=${r.json?.name}`,
          );
    } else {
      fail('start_thread_identity_bound', `status=${r.status} ${JSON.stringify(r.json)}`);
    }
  }

  {
    const r = await req('POST', '/api/v1/support/thread', {
      token: userTok,
      body: {
        name: 'E2E Support',
        email: 'e2e.support@example.com',
        subject: 'BUG',
        message: 'Second open should fail.',
        appVersion: '2.4.1',
        deviceLabel: 'Pixel 7 · Android 14',
      },
    });
    r.status === 409
      ? pass('open_limit')
      : fail('open_limit', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/support/thread/${threadId}/messages`, {
      token: otherTok,
      body: { message: 'IDOR attempt' },
    });
    r.status === 404
      ? pass('idor_blocked')
      : fail('idor_blocked', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/support/thread/${threadId}/messages`, {
      token: userTok,
      body: { message: '<script>alert(1)</script> hack' },
    });
    r.status === 400
      ? pass('reject_script')
      : fail('reject_script', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/support/thread/${threadId}/messages`, {
      token: userTok,
      body: { message: 'Still broken after reboot.' },
    });
    r.status === 200 || r.status === 201
      ? (r.json?.status === 'PENDING_REPLY'
          ? pass('user_reply')
          : fail('user_reply', `status=${r.status} ${r.json?.status}`))
      : fail('user_reply', `status=${r.status} ${r.json?.status}`);
  }

  const adminRow = await prisma.admin.findFirst({
    where: {
      email: adminEmail.trim().toLowerCase(),
      isActive: true,
    },
  });
  const adminTok = adminRow
    ? jwt.sign(
        { sub: adminRow.id, email: adminRow.email, role: adminRow.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '1h' },
      )
    : undefined;
  adminTok && adminRow
    ? pass('admin_login', 'minted jwt')
    : fail('admin_login', 'active admin not found');
  if (!adminTok) {
    console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }

  {
    const r = await req('GET', '/api/v1/admin/support', { token: adminTok });
    const hit = (r.json?.threads ?? []).some((t: any) => t.id === threadId);
    r.status === 200 && hit
      ? pass('admin_list')
      : fail('admin_list', `status=${r.status}`);
  }

  {
    const dataPath = path.join(
      __dirname,
      '..',
      '..',
      'admin',
      'src',
      'components',
      'support',
      'support-data.ts',
    );
    const src = fs.readFileSync(dataPath, 'utf8');
    !src.includes('SUPPORT_DEMO_ROWS')
      ? pass('admin_support_no_demo_rows')
      : fail('admin_support_no_demo_rows');
  }

  {
    const r = await req('GET', '/api/v1/admin/support/stats', { token: adminTok });
    r.status === 200 && typeof r.json?.total === 'number' && r.json.unread >= 1
      ? pass('admin_stats')
      : fail('admin_stats', JSON.stringify(r.json));
  }

  {
    const bug = await req('GET', '/api/v1/admin/support?subject=BUG', {
      token: adminTok,
    });
    const feat = await req('GET', '/api/v1/admin/support?subject=FEATURE', {
      token: adminTok,
    });
    const bugHit = (bug.json?.threads ?? []).some((t: any) => t.id === threadId);
    const featHit = (feat.json?.threads ?? []).some(
      (t: any) => t.id === threadId,
    );
    bug.status === 200 && bugHit && feat.status === 200 && !featHit
      ? pass('admin_subject_filter')
      : fail('admin_subject_filter', `bug=${bugHit} feat=${featHit}`);
  }

  {
    const unread = await req('GET', '/api/v1/admin/support?unread=1', {
      token: adminTok,
    });
    const hit = (unread.json?.threads ?? []).some((t: any) => t.id === threadId);
    unread.status === 200 && hit
      ? pass('admin_unread_filter')
      : fail('admin_unread_filter', `status=${unread.status}`);
  }

  {
    const r = await req('PATCH', `/api/v1/admin/support/${threadId}/read`, {
      token: adminTok,
    });
    r.status === 200 && r.json?.unread === false
      ? pass('admin_mark_read')
      : fail('admin_mark_read', JSON.stringify(r.json));
  }

  {
    const r = await req('POST', `/api/v1/admin/support/${threadId}/reply`, {
      token: adminTok,
      body: { message: 'Thanks — fix queued for next build.' },
    });
    r.status === 200 || r.status === 201
      ? (r.json?.status === 'REPLIED'
          ? pass('admin_reply')
          : fail('admin_reply', `status=${r.status} ${JSON.stringify(r.json)}`))
      : fail('admin_reply', `status=${r.status}`);
  }

  {
    const r = await req('GET', '/api/v1/support/thread', { token: userTok });
    const hasAdmin = (r.json?.thread?.messages ?? []).some(
      (m: any) => m.sender === 'ADMIN',
    );
    r.status === 200 && hasAdmin
      ? pass('user_sees_admin_reply')
      : fail('user_sees_admin_reply', JSON.stringify(r.json?.thread?.messages));
  }

  {
    const r = await req('PATCH', `/api/v1/admin/support/${threadId}/close`, {
      token: adminTok,
    });
    r.status === 200 && r.json?.status === 'CLOSED'
      ? pass('admin_close')
      : fail('admin_close', `status=${r.status}`);
  }

  {
    const r = await req('POST', `/api/v1/support/thread/${threadId}/messages`, {
      token: userTok,
      body: { message: 'Should fail on closed' },
    });
    r.status === 409
      ? pass('reply_closed_blocked')
      : fail('reply_closed_blocked', `status=${r.status}`);
  }

  const noSupport = await prisma.admin.upsert({
    where: { email: 'e2e.nosupport@example.com' },
    update: {
      isActive: true,
      allowedModules: ['community'],
      role: 'ADMIN',
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.nosupport@example.com',
      passwordHash: '$2b$10$invalidhashfortestsonlyxxxxxx',
      role: 'ADMIN',
      isActive: true,
      allowedModules: ['community'],
      mustChangePassword: false,
    },
  });
  const noSupportTok = jwt.sign(
    { sub: noSupport.id, email: noSupport.email, role: 'ADMIN' },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/support', {
      token: noSupportTok,
    });
    r.status === 403
      ? pass('module_guard_403')
      : fail('module_guard_403', `status=${r.status}`);
  }

  {
    const listed = await req('GET', '/api/v1/admin/support', { token: adminTok });
    const row = (listed.json?.threads ?? []).find((t: any) => t.id === threadId);
    const userMsg = (row?.messages ?? []).find((m: any) => m.sender === 'USER');
    if (!userMsg?.id) {
      fail('admin_delete_user_message', 'no user message');
    } else {
      const r = await req(
        'DELETE',
        `/api/v1/admin/support/${threadId}/messages/${userMsg.id}`,
        { token: adminTok },
      );
      const gone = !(r.json?.messages ?? []).some(
        (m: any) => m.id === userMsg.id,
      );
      r.status === 200 && gone
        ? pass('admin_delete_user_message')
        : fail('admin_delete_user_message', `status=${r.status}`);
    }
  }

  {
    const r = await req('DELETE', `/api/v1/admin/support/${threadId}`, {
      token: adminTok,
    });
    const listed = await req('GET', '/api/v1/admin/support', { token: adminTok });
    const hit = (listed.json?.threads ?? []).some((t: any) => t.id === threadId);
    r.status === 200 && r.json?.ok === true && !hit
      ? pass('admin_delete_thread')
      : fail('admin_delete_thread', `status=${r.status} hit=${hit}`);
  }

  {
    const r = await req('GET', '/api/v1/admin/support', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_on_admin')
      : fail('user_jwt_blocked_on_admin', `status=${r.status}`);
  }

  const ok = checks.filter((c) => c.ok).length;
  console.log(`\n${ok}/${checks.length} passed`);
  await prisma.$disconnect();
  process.exit(ok === checks.length ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
