import { PrismaClient } from '@prisma/client';

async function main() {
  const p = new PrismaClient();
  const r = await p.$executeRawUnsafe(
    'UPDATE challenge_config SET ad_bonus_cooldown_minutes = ad_bonus_cooldown_hours * 60',
  );
  console.log('synced_rows', r);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
