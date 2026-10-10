import { PrismaService } from '../prisma/prisma.service';

/** Profile notification switch. Missing row still allows push. */
export async function userAllowsPush(
  prisma: PrismaService,
  userId: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyPush: true },
  });
  return user?.notifyPush !== false;
}
