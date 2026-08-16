import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppError } from '../common/errors/app-error';
import type { NameFontDto, NameFrameDto, NamesPolicyDto } from './dto/names.dto';

export const CONFIG_ID = 1;
export const MAX_AFFIX = 32;
export const MAX_FRAMES = 80;
export const MAX_FONTS = 20;

export function sanitizeAffix(raw: string): string {
  return [...raw]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      if (code === 0xfeff) return false;
      return true;
    })
    .join('')
    .slice(0, MAX_AFFIX);
}

export function sanitizeId(raw: string, fallback: string): string {
  const id = (raw?.trim() || fallback)
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 64);
  if (!id) {
    throw new AppError('NAMES_BAD_ID', 'Invalid id.', 400);
  }
  return id;
}

export function mapFrame(f: {
  id: string;
  label: string;
  prefix: string;
  suffix: string;
  premium: boolean;
  enabled: boolean;
}) {
  return {
    id: f.id,
    label: f.label,
    prefix: f.prefix,
    suffix: f.suffix,
    premium: f.premium,
    enabled: f.enabled,
  };
}

export function mapFont(f: {
  id: string;
  label: string;
  sample: string;
  enabled: boolean;
}) {
  return {
    id: f.id,
    label: f.label,
    sample: f.sample,
    enabled: f.enabled,
  };
}

export function mapPolicy(row: {
  maxNameChars: number;
  maxBatchSize: number;
  allowSpacesInInput: boolean;
  requireStyleWrap: boolean;
  remotePackEnabled: boolean;
  remotePackUrl: string | null;
}): NamesPolicyDto {
  return {
    maxNameChars: row.maxNameChars,
    maxBatchSize: row.maxBatchSize,
    blockSpaces: !row.allowSpacesInInput,
    requireStyleWrap: row.requireStyleWrap,
    remotePackEnabled: row.remotePackEnabled,
    remotePackUrl: row.remotePackUrl ?? '',
  };
}

export function frameWriteData(f: NameFrameDto, sortOrder: number) {
  return {
    id: sanitizeId(f.id, `frame_${sortOrder + 1}`),
    label: f.label.trim().slice(0, 80),
    prefix: sanitizeAffix(f.prefix),
    suffix: sanitizeAffix(f.suffix),
    premium: f.premium,
    enabled: f.enabled,
    sortOrder,
  };
}

export function fontWriteData(f: NameFontDto, sortOrder: number) {
  return {
    id: sanitizeId(f.id, `font_${sortOrder + 1}`),
    label: f.label.trim().slice(0, 80),
    sample: f.sample.trim().slice(0, 120),
    enabled: f.enabled,
    sortOrder,
  };
}

function isBlockedRemoteHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) {
    return true;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split('.').map((n) => Number(n));
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
    return true;
  }
  return false;
}

export function assertSafeRemoteUrl(
  enabled: boolean,
  urlRaw: string | undefined,
): string | null {
  const url = (urlRaw ?? '').trim();
  if (!enabled) return null;
  if (!url) {
    throw new AppError(
      'NAMES_REMOTE_URL',
      'Remote pack URL is required when sync is enabled.',
      400,
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('NAMES_REMOTE_URL', 'Remote pack URL is invalid.', 400);
  }
  if (parsed.protocol !== 'https:') {
    throw new AppError('NAMES_REMOTE_URL', 'Remote pack URL must use https.', 400);
  }
  if (parsed.username || parsed.password) {
    throw new AppError(
      'NAMES_REMOTE_URL',
      'Remote pack URL must not include credentials.',
      400,
    );
  }
  if (isBlockedRemoteHost(parsed.hostname)) {
    throw new AppError('NAMES_REMOTE_URL', 'Remote pack URL host is not allowed.', 400);
  }
  if (url.length > 500) {
    throw new AppError('NAMES_REMOTE_URL', 'Remote pack URL is too long.', 400);
  }
  return url;
}

export function assertFrames(frames: NameFrameDto[]) {
  if (frames.length > MAX_FRAMES) {
    throw new AppError('NAMES_FRAME_LIMIT', 'Too many frames.', 400);
  }
  const ids = new Set<string>();
  for (const f of frames) {
    const id = sanitizeId(f.id, 'frame');
    if (ids.has(id)) {
      throw new AppError('NAMES_DUP_FRAME', `Duplicate frame id “${id}”.`, 400);
    }
    ids.add(id);
    if (!sanitizeAffix(f.prefix) && !sanitizeAffix(f.suffix)) {
      throw new AppError(
        'NAMES_EMPTY_FRAME',
        `Frame “${id}” needs a prefix or suffix.`,
        400,
      );
    }
  }
}

export function assertFonts(fonts: NameFontDto[]) {
  if (fonts.length > MAX_FONTS) {
    throw new AppError('NAMES_FONT_LIMIT', 'Too many fonts.', 400);
  }
  const ids = new Set<string>();
  for (const f of fonts) {
    const id = sanitizeId(f.id, 'font');
    if (ids.has(id)) {
      throw new AppError('NAMES_DUP_FONT', `Duplicate font id “${id}”.`, 400);
    }
    ids.add(id);
  }
  if (!fonts.some((f) => f.enabled)) {
    throw new AppError(
      'NAMES_NO_FONT',
      'At least one letter font must stay enabled.',
      400,
    );
  }
}

export async function ensureNamesDefaults(prisma: PrismaService) {
  await prisma.namesConfig.upsert({
    where: { id: CONFIG_ID },
    update: {},
    create: { id: CONFIG_ID },
  });
}

export async function auditNames(
  prisma: PrismaService,
  adminId: string,
  action: string,
  entity: string,
  afterJson: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: { actorAdminId: adminId, action, entity, afterJson },
  });
}

export function rethrowUnique(err: unknown, code: string, message: string): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    throw new AppError(code, message, 409);
  }
  throw err;
}
