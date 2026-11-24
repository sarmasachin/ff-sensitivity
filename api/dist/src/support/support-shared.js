"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORT_ACKNOWLEDGEMENT = exports.LIST_LIMIT = exports.MAX_OPEN_THREADS = exports.MAX_MESSAGES_PER_THREAD = void 0;
exports.stamp = stamp;
exports.sanitizeText = sanitizeText;
exports.assertSafeMessage = assertSafeMessage;
exports.assertThreadId = assertThreadId;
exports.parseListStatus = parseListStatus;
exports.parseListSubject = parseListSubject;
exports.parseUnreadFlag = parseUnreadFlag;
exports.toSupportMessage = toSupportMessage;
exports.toSupportThreadRow = toSupportThreadRow;
const client_1 = require("@prisma/client");
const app_error_1 = require("../common/errors/app-error");
exports.MAX_MESSAGES_PER_THREAD = 40;
exports.MAX_OPEN_THREADS = 1;
exports.LIST_LIMIT = 100;
exports.SUPPORT_ACKNOWLEDGEMENT = 'Thank you for contacting FF Sensitivity Support. We’ve received your message successfully. Our support team will review the details and respond here. Depending on the nature of your request, resolution may take 12–72 hours. Please avoid sending duplicate messages, as this can delay processing.';
const OPEN_STATUSES = [
    client_1.SupportStatus.OPEN,
    client_1.SupportStatus.PENDING_REPLY,
];
const SINGLE_STATUSES = new Set([
    client_1.SupportStatus.OPEN,
    client_1.SupportStatus.PENDING_REPLY,
    client_1.SupportStatus.REPLIED,
    client_1.SupportStatus.CLOSED,
]);
const SUBJECTS = new Set(Object.values(client_1.SupportSubject));
function stamp(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function sanitizeText(raw, max) {
    return [...raw]
        .filter((ch) => {
        const code = ch.codePointAt(0) ?? 0;
        if (code === 0x0a || code === 0x0d)
            return true;
        if (code < 0x20 || code === 0x7f)
            return false;
        if (code >= 0x200b && code <= 0x200f)
            return false;
        if (code === 0xfeff)
            return false;
        return true;
    })
        .join('')
        .trim()
        .slice(0, max);
}
function assertSafeMessage(text) {
    const lower = text.toLowerCase();
    if (lower.includes('javascript:') ||
        lower.includes('data:text/html') ||
        /<script[\s>]/i.test(text)) {
        throw new app_error_1.AppError('SUPPORT_UNSAFE_TEXT', 'Message contains disallowed content.', 400);
    }
}
function assertThreadId(id, label = 'thread') {
    if (!id?.trim() || id.includes('/') || id.length > 64) {
        throw new app_error_1.AppError('SUPPORT_BAD_ID', `Invalid ${label} id.`, 400);
    }
}
function parseListStatus(status) {
    const raw = (status ?? '').trim();
    if (!raw)
        return undefined;
    if (raw === 'open')
        return OPEN_STATUSES;
    if (SINGLE_STATUSES.has(raw))
        return raw;
    return undefined;
}
function parseListSubject(subject) {
    const raw = (subject ?? '').trim();
    if (!raw || !SUBJECTS.has(raw))
        return undefined;
    return raw;
}
function parseUnreadFlag(unread) {
    const raw = (unread ?? '').trim().toLowerCase();
    if (raw === '1' || raw === 'true')
        return true;
    if (raw === '0' || raw === 'false')
        return false;
    return undefined;
}
function toSupportMessage(m) {
    return {
        id: m.id,
        sender: m.sender,
        text: m.text,
        createdAt: stamp(m.createdAt),
        createdAtMs: m.createdAt.getTime(),
    };
}
function toSupportThreadRow(t) {
    return {
        id: t.id,
        name: t.name,
        email: t.email,
        subject: t.subject,
        status: t.status,
        appVersion: t.appVersion,
        deviceLabel: t.deviceLabel,
        unread: t.unread,
        createdAt: stamp(t.createdAt),
        updatedAt: stamp(t.updatedAt),
        createdAtMs: t.createdAt.getTime(),
        updatedAtMs: t.updatedAt.getTime(),
        messages: t.messages.map((m) => toSupportMessage(m)),
    };
}
//# sourceMappingURL=support-shared.js.map