import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const email = (process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com')
    .trim()
    .toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      mustChangePassword: true,
    },
    create: {
      email,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      allowedModules: [],
      isActive: true,
      mustChangePassword: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Super Admin ready: ${admin.email}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
