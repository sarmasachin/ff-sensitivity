import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DELETED_USER_PURGE_INTERVAL_MS,
  purgeDeletedUsers,
} from './users-purge';

@Injectable()
export class UsersPurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(UsersPurgeService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.runOnce().catch((err) => {
      this.log.warn(`Deleted-user purge failed on boot: ${String(err)}`);
    });
    this.timer = setInterval(() => {
      void this.runOnce().catch((err) => {
        this.log.warn(`Deleted-user auto-purge failed: ${String(err)}`);
      });
    }, DELETED_USER_PURGE_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runOnce() {
    const result = await purgeDeletedUsers(this.prisma);
    if (result.purged > 0) {
      this.log.log(
        `Purged ${result.purged} soft-deleted user(s) older than cutoff ${result.cutoff}`,
      );
    }
    return result;
  }
}
