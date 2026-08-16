import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import type { NameFontDto, NameFrameDto } from './dto/names.dto';
import {
  MAX_FONTS,
  MAX_FRAMES,
  assertFonts,
  assertFrames,
  auditNames,
  fontWriteData,
  frameWriteData,
  mapFont,
  mapFrame,
  rethrowUnique,
  sanitizeId,
} from './names-shared';

@Injectable()
export class NamesAdminItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFrame(adminId: string, dto: NameFrameDto) {
    assertFrames([dto]);
    const count = await this.prisma.nameFrame.count();
    if (count >= MAX_FRAMES) {
      throw new AppError('NAMES_FRAME_LIMIT', 'Too many frames.', 400);
    }
    const first = await this.prisma.nameFrame.findFirst({
      orderBy: { sortOrder: 'asc' },
      select: { sortOrder: true },
    });
    const data = frameWriteData(dto, (first?.sortOrder ?? 0) - 1);
    try {
      const row = await this.prisma.nameFrame.create({ data });
      await auditNames(
        this.prisma,
        adminId,
        'names.frame.create',
        `name_frame:${row.id}`,
        { id: row.id },
      );
      return mapFrame(row);
    } catch (e) {
      rethrowUnique(e, 'NAMES_DUP_FRAME', `Frame id already exists: ${data.id}`);
    }
  }

  async updateFrame(adminId: string, rawId: string, dto: NameFrameDto) {
    assertFrames([dto]);
    const id = sanitizeId(rawId, 'frame');
    const existing = await this.prisma.nameFrame.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NAMES_FRAME_NOT_FOUND', 'Frame not found.', 404);
    }
    const data = frameWriteData({ ...dto, id }, existing.sortOrder);
    const row = await this.prisma.nameFrame.update({
      where: { id },
      data: {
        label: data.label,
        prefix: data.prefix,
        suffix: data.suffix,
        premium: data.premium,
        enabled: data.enabled,
      },
    });
    await auditNames(
      this.prisma,
      adminId,
      'names.frame.update',
      `name_frame:${id}`,
      { id },
    );
    return mapFrame(row);
  }

  async deleteFrame(adminId: string, rawId: string) {
    const id = sanitizeId(rawId, 'frame');
    const deleted = await this.prisma.nameFrame.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      throw new AppError('NAMES_FRAME_NOT_FOUND', 'Frame not found.', 404);
    }
    await auditNames(
      this.prisma,
      adminId,
      'names.frame.delete',
      `name_frame:${id}`,
      { id },
    );
    return { ok: true as const, id };
  }

  async updateFont(adminId: string, rawId: string, dto: NameFontDto) {
    assertFonts([
      dto,
      ...(await this.otherFonts(sanitizeId(rawId, 'font'), dto)),
    ]);
    const id = sanitizeId(rawId, 'font');
    const existing = await this.prisma.nameFont.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError('NAMES_FONT_NOT_FOUND', 'Font not found.', 404);
    }
    const data = fontWriteData({ ...dto, id }, existing.sortOrder);
    const row = await this.prisma.nameFont.update({
      where: { id },
      data: {
        label: data.label,
        sample: data.sample,
        enabled: data.enabled,
      },
    });
    await auditNames(
      this.prisma,
      adminId,
      'names.font.update',
      `name_font:${id}`,
      { id, enabled: row.enabled },
    );
    return mapFont(row);
  }

  private async otherFonts(id: string, dto: NameFontDto): Promise<NameFontDto[]> {
    const others = await this.prisma.nameFont.findMany({
      where: { NOT: { id } },
    });
    if (others.length + 1 > MAX_FONTS) {
      throw new AppError('NAMES_FONT_LIMIT', 'Too many fonts.', 400);
    }
    return others.map((f) => ({
      id: f.id,
      label: f.label,
      sample: f.sample,
      enabled: f.enabled,
    }));
  }
}
