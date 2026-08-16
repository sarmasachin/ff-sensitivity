/**
 * Names admin + public catalog e2e / security (local Postgres).
 */
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import {
  checks,
  fail,
  goodNamesBundle,
  loadEnv,
  pass,
  prisma,
  req,
} from './e2e-names-lib';
import { runNamesFramePersistChecks } from './e2e-names-frames';
import { runNamesSecurityChecks } from './e2e-names-security';

async function main() {
  loadEnv();
  const adminEmail = process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com';

  {
    const r = await req('GET', '/api/v1/names/catalog');
    if (
      r.status === 200 &&
      Array.isArray(r.json?.frames) &&
      r.json?.policy?.maxNameChars
    ) {
      if (r.json.policy.remotePackUrl !== undefined) {
        fail('public_catalog_no_remote_url', 'policy leaked remotePackUrl');
      } else {
        pass('public_catalog', `frames=${r.json.frames.length}`);
      }
    } else {
      fail('public_catalog', `status=${r.status}`);
    }
  }

  {
    const r = await req('GET', '/api/v1/admin/names');
    r.status === 401
      ? pass('admin_auth_required')
      : fail('admin_auth_required', `status=${r.status}`);
  }

  const adminRow = await prisma.admin.findFirst({
    where: {
      email: adminEmail.trim().toLowerCase(),
      isActive: true,
    },
  });
  const superToken = adminRow
    ? jwt.sign(
        { sub: adminRow.id, email: adminRow.email, role: adminRow.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '1h' },
      )
    : undefined;
  if (!superToken || !adminRow) {
    fail('super_login', 'active admin not found');
    console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} passed`);
    await prisma.$disconnect();
    process.exit(1);
  }
  pass('super_login', 'minted jwt');

  const snapshot = await req('GET', '/api/v1/admin/names', { token: superToken });
  snapshot.status === 200 && snapshot.json?.policy && Array.isArray(snapshot.json.fonts)
    ? pass('admin_get', `fonts=${snapshot.json.fonts.length}`)
    : fail('admin_get', `status=${snapshot.status}`);

  const goodBundle = goodNamesBundle();

  {
    const r = await req('PUT', '/api/v1/admin/names', {
      token: superToken,
      body: goodBundle,
    });
    r.status === 200 && r.json?.frames?.[0]?.id === 'e2e_classic'
      ? pass('admin_save')
      : fail('admin_save', `status=${r.status} ${JSON.stringify(r.json)}`);
  }

  {
    const dataPath = path.join(
      __dirname,
      '..',
      '..',
      'admin',
      'src',
      'components',
      'names',
      'names-data.ts',
    );
    const src = fs.readFileSync(dataPath, 'utf8');
    !src.includes('NAMES_DEMO_FRAMES') && !src.includes('NAMES_DEMO_FONTS')
      ? pass('admin_names_no_demo_rows')
      : fail('admin_names_no_demo_rows');
  }

  await runNamesFramePersistChecks(superToken);

  {
    const r = await req('GET', '/api/v1/names/catalog');
    const ids = (r.json?.frames ?? []).map((f: any) => f.id);
    r.status === 200 && ids.includes('e2e_classic')
      ? pass('public_enabled_only')
      : fail('public_enabled_only', JSON.stringify(ids));
  }

  await runNamesSecurityChecks(superToken, goodBundle);

  const userSecret = process.env.JWT_USER_SECRET!;
  const appUser = await prisma.user.upsert({
    where: { email: 'e2e.names.user@example.com' },
    update: { isActive: true },
    create: {
      googleSub: 'e2e-names-user',
      email: 'e2e.names.user@example.com',
      displayName: 'E2E Names User',
      isActive: true,
    },
  });
  const userTok = jwt.sign(
    { sub: appUser.id, email: appUser.email, aud: 'user' },
    userSecret,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/names', { token: userTok });
    r.status === 401
      ? pass('user_jwt_blocked_on_admin')
      : fail('user_jwt_blocked_on_admin', `status=${r.status}`);
  }

  const noNames = await prisma.admin.upsert({
    where: { email: 'e2e.nonames@example.com' },
    update: {
      isActive: true,
      allowedModules: ['community'],
      role: 'ADMIN',
      mustChangePassword: false,
    },
    create: {
      email: 'e2e.nonames@example.com',
      passwordHash: '$2b$10$invalidhashfortestsonlyxxxxxx',
      role: 'ADMIN',
      isActive: true,
      allowedModules: ['community'],
      mustChangePassword: false,
    },
  });
  const noNamesTok = jwt.sign(
    { sub: noNames.id, email: noNames.email, role: 'ADMIN' },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: '1h' },
  );
  {
    const r = await req('GET', '/api/v1/admin/names', { token: noNamesTok });
    r.status === 403
      ? pass('names_module_guard_403')
      : fail('names_module_guard_403', `HTTP ${r.status}`);
  }

  await req('PUT', '/api/v1/admin/names', {
    token: superToken,
    body: {
      policy: snapshot.json?.policy ?? {
        maxNameChars: 12,
        maxBatchSize: 100,
        blockSpaces: true,
        requireStyleWrap: true,
        remotePackEnabled: false,
        remotePackUrl: '',
      },
      frames: Array.isArray(snapshot.json?.frames) ? snapshot.json.frames : [],
      fonts: Array.isArray(snapshot.json?.fonts) && snapshot.json.fonts.length
        ? snapshot.json.fonts
        : [
            { id: 'normal', label: 'Caps', sample: 'GHOST', enabled: true },
          ],
    },
  });
  pass('restore_catalog');

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
