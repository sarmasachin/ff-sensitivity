/**
 * Delete leftover ProMax / e2e fake users (and cascaded compare rows).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const found = await prisma.user.findMany({
    where: {
      OR: [
        { email: { startsWith: 'e2e.promax.' } },
        { googleSub: { startsWith: 'e2e-promax-' } },
        { displayName: { in: ['ProMax Peer A', 'ProMax Peer B', 'ProMax E2E Viewer'] } },
      ],
    },
    select: { id: true, email: true, displayName: true, googleSub: true },
  });

  if (found.length === 0) {
    console.log(JSON.stringify({ ok: true, deleted: 0, message: 'No fake users found' }));
    await prisma.$disconnect();
    return;
  }

  const ids = found.map((u) => u.id);
  const del = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  console.log(
    JSON.stringify(
      {
        ok: true,
        deleted: del.count,
        samples: found.slice(0, 8).map((u) => ({
          email: u.email,
          displayName: u.displayName,
        })),
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
