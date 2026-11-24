"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_FONTS = exports.MAX_FRAMES = exports.MAX_AFFIX = exports.CONFIG_ID = void 0;
exports.sanitizeAffix = sanitizeAffix;
exports.sanitizeId = sanitizeId;
exports.mapFrame = mapFrame;
exports.mapFont = mapFont;
exports.mapPolicy = mapPolicy;
exports.frameWriteData = frameWriteData;
exports.fontWriteData = fontWriteData;
exports.assertSafeRemoteUrl = assertSafeRemoteUrl;
exports.assertFrames = assertFrames;
exports.assertFonts = assertFonts;
exports.ensureNamesDefaults = ensureNamesDefaults;
exports.auditNames = auditNames;
exports.rethrowUnique = rethrowUnique;
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
exports.CONFIG_ID = 1;
exports.MAX_AFFIX = 32;
exports.MAX_FRAMES = 80;
exports.MAX_FONTS = 20;
function sanitizeAffix(raw) {
    return [...raw]
        .filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        if (code < 0x20 || code === 0x7f)
            return false;
        if (code >= 0x200b && code <= 0x200f)
            return false;
        if (code === 0xfeff)
            return false;
        return true;
    })
        .join('')
        .slice(0, exports.MAX_AFFIX);
}
function sanitizeId(raw, fallback) {
    const id = (raw?.trim() || fallback)
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 64);
    if (!id) {
        throw new app_error_1.AppError('NAMES_BAD_ID', 'Invalid id.', 400);
    }
    return id;
}
function mapFrame(f) {
    return {
        id: f.id,
        label: f.label,
        prefix: f.prefix,
        suffix: f.suffix,
        premium: f.premium,
        enabled: f.enabled,
    };
}
function mapFont(f) {
    return {
        id: f.id,
        label: f.label,
        sample: f.sample,
        enabled: f.enabled,
    };
}
function mapPolicy(row) {
    return {
        maxNameChars: row.maxNameChars,
        maxBatchSize: row.maxBatchSize,
        blockSpaces: !row.allowSpacesInInput,
        requireStyleWrap: row.requireStyleWrap,
        remotePackEnabled: row.remotePackEnabled,
        remotePackUrl: row.remotePackUrl ?? '',
    };
}
function frameWriteData(f, sortOrder) {
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
function fontWriteData(f, sortOrder) {
    return {
        id: sanitizeId(f.id, `font_${sortOrder + 1}`),
        label: f.label.trim().slice(0, 80),
        sample: f.sample.trim().slice(0, 120),
        enabled: f.enabled,
        sortOrder,
    };
}
function isBlockedRemoteHost(hostname) {
    const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) {
        return true;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
        const [a, b] = h.split('.').map((n) => Number(n));
        if (a === 0 || a === 10 || a === 127)
            return true;
        if (a === 169 && b === 254)
            return true;
        if (a === 172 && b >= 16 && b <= 31)
            return true;
        if (a === 192 && b === 168)
            return true;
        if (a === 100 && b >= 64 && b <= 127)
            return true;
    }
    if (h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) {
        return true;
    }
    return false;
}
function assertSafeRemoteUrl(enabled, urlRaw) {
    const url = (urlRaw ?? '').trim();
    if (!enabled)
        return null;
    if (!url) {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL is required when sync is enabled.', 400);
    }
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL is invalid.', 400);
    }
    if (parsed.protocol !== 'https:') {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL must use https.', 400);
    }
    if (parsed.username || parsed.password) {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL must not include credentials.', 400);
    }
    if (isBlockedRemoteHost(parsed.hostname)) {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL host is not allowed.', 400);
    }
    if (url.length > 500) {
        throw new app_error_1.AppError('NAMES_REMOTE_URL', 'Remote pack URL is too long.', 400);
    }
    return url;
}
function assertFrames(frames) {
    if (frames.length > exports.MAX_FRAMES) {
        throw new app_error_1.AppError('NAMES_FRAME_LIMIT', 'Too many frames.', 400);
    }
    const ids = new Set();
    for (const f of frames) {
        const id = sanitizeId(f.id, 'frame');
        if (ids.has(id)) {
            throw new app_error_1.AppError('NAMES_DUP_FRAME', `Duplicate frame id “${id}”.`, 400);
        }
        ids.add(id);
        if (!sanitizeAffix(f.prefix) && !sanitizeAffix(f.suffix)) {
            throw new app_error_1.AppError('NAMES_EMPTY_FRAME', `Frame “${id}” needs a prefix or suffix.`, 400);
        }
    }
}
function assertFonts(fonts) {
    if (fonts.length > exports.MAX_FONTS) {
        throw new app_error_1.AppError('NAMES_FONT_LIMIT', 'Too many fonts.', 400);
    }
    const ids = new Set();
    for (const f of fonts) {
        const id = sanitizeId(f.id, 'font');
        if (ids.has(id)) {
            throw new app_error_1.AppError('NAMES_DUP_FONT', `Duplicate font id “${id}”.`, 400);
        }
        ids.add(id);
    }
    if (!fonts.some((f) => f.enabled)) {
        throw new app_error_1.AppError('NAMES_NO_FONT', 'At least one letter font must stay enabled.', 400);
    }
}
async function ensureNamesDefaults(prisma) {
    await prisma.namesConfig.upsert({
        where: { id: exports.CONFIG_ID },
        update: {},
        create: { id: exports.CONFIG_ID },
    });
}
async function auditNames(prisma, adminId, action, entity, afterJson) {
    await prisma.auditLog.create({
        data: { actorAdminId: adminId, action, entity, afterJson },
    });
}
function rethrowUnique(err, code, message) {
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002') {
        throw new app_error_1.AppError(code, message, 409);
    }
    throw err;
}
//# sourceMappingURL=names-shared.js.map