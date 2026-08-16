import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { SaveNamesDto } from './dto/names.dto';
import {
  CONFIG_ID,
  assertFonts,
  assertFrames,
  assertSafeRemoteUrl,
  ensureNamesDefaults,
  fontWriteData,
  frameWriteData,
  mapFont,
  mapFrame,
  mapPolicy,
} from './names-shared';

@Injectable()
export class NamesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    await ensureNamesDefaults(this.prisma);
  }

  async adminGetBundle() {
    await ensureNamesDefaults(this.prisma);
    const [cfg, frames, fonts] = await Promise.all([
      this.prisma.namesConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
      this.prisma.nameFrame.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.nameFont.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    return {
      policy: mapPolicy(cfg),
      frames: frames.map((f) => mapFrame(f)),
      fonts: fonts.map((f) => mapFont(f)),
    };
  }

  async adminSave(adminId: string, dto: SaveNamesDto) {
    if (dto.frames !== undefined) assertFrames(dto.frames);
    if (dto.fonts !== undefined) assertFonts(dto.fonts);
    const remoteUrl = assertSafeRemoteUrl(
      dto.policy.remotePackEnabled,
      dto.policy.remotePackUrl,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.namesConfig.upsert({
        where: { id: CONFIG_ID },
        update: {
          maxNameChars: dto.policy.maxNameChars,
          maxBatchSize: dto.policy.maxBatchSize,
          allowSpacesInInput: !dto.policy.blockSpaces,
          requireStyleWrap: dto.policy.requireStyleWrap,
          remotePackEnabled: dto.policy.remotePackEnabled,
          remotePackUrl: remoteUrl,
        },
        create: {
          id: CONFIG_ID,
          maxNameChars: dto.policy.maxNameChars,
          maxBatchSize: dto.policy.maxBatchSize,
          allowSpacesInInput: !dto.policy.blockSpaces,
          requireStyleWrap: dto.policy.requireStyleWrap,
          remotePackEnabled: dto.policy.remotePackEnabled,
          remotePackUrl: remoteUrl,
        },
      });

      if (dto.frames !== undefined) {
        await tx.nameFrame.deleteMany({});
        if (dto.frames.length) {
          await tx.nameFrame.createMany({
            data: dto.frames.map((f, i) => frameWriteData(f, i)),
          });
        }
      }

      if (dto.fonts !== undefined) {
        await tx.nameFont.deleteMany({});
        await tx.nameFont.createMany({
          data: dto.fonts.map((f, i) => fontWriteData(f, i)),
        });
      }

      await tx.auditLog.create({
        data: {
          actorAdminId: adminId,
          action: 'names.save',
          entity: 'names_config:default',
          afterJson: {
            frames: dto.frames?.length ?? null,
            fonts: dto.fonts?.length ?? null,
            maxNameChars: dto.policy.maxNameChars,
          } as Prisma.InputJsonValue,
        },
      });
    });

    return this.adminGetBundle();
  }

  async userCatalog() {
    await ensureNamesDefaults(this.prisma);
    const [cfg, frames, fonts] = await Promise.all([
      this.prisma.namesConfig.findUniqueOrThrow({ where: { id: CONFIG_ID } }),
      this.prisma.nameFrame.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.nameFont.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return {
      policy: {
        maxNameChars: cfg.maxNameChars,
        maxBatchSize: cfg.maxBatchSize,
        blockSpaces: !cfg.allowSpacesInInput,
        requireStyleWrap: cfg.requireStyleWrap,
      },
      frames: frames.map((f) => ({
        id: f.id,
        label: f.label,
        prefix: f.prefix,
        suffix: f.suffix,
        premium: f.premium,
      })),
      fonts: fonts.map((f) => ({
        id: f.id,
        label: f.label,
        sample: f.sample,
      })),
    };
  }
}
