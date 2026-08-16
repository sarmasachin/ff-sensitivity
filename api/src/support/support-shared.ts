import {
  SupportSender,
  SupportStatus,
  SupportSubject,
} from '@prisma/client';
import { AppError } from '../common/errors/app-error';

export const MAX_MESSAGES_PER_THREAD = 40;
export const MAX_OPEN_THREADS = 1;
export const LIST_LIMIT = 100;
export const SUPPORT_ACKNOWLEDGEMENT =
  'Thank you for contacting FF Sensitivity Support. We’ve received your message successfully. Our support team will review the details and respond here. Depending on the nature of your request, resolution may take 12–72 hours. Please avoid sending duplicate messages, as this can delay processing.';

const OPEN_STATUSES: SupportStatus[] = [
  SupportStatus.OPEN,
  SupportStatus.PENDING_REPLY,
];

const SINGLE_STATUSES = new Set<string>([
  SupportStatus.OPEN,
  SupportStatus.PENDING_REPLY,
  SupportStatus.REPLIED,
  SupportStatus.CLOSED,
]);

const SUBJECTS = new Set<string>(Object.values(SupportSubject));

export function stamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sanitizeText(raw: string, max: number): string {
  return [...raw]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code === 0x0a || code === 0x0d) return true;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      if (code === 0xfeff) return false;
      return true;
    })
    .join('')
    .trim()
    .slice(0, max);
}

export function assertSafeMessage(text: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'SUPPORT_UNSAFE_TEXT',
      'Message contains disallowed content.',
      400,
    );
  }
}

export function assertThreadId(id: string, label = 'thread') {
  if (!id?.trim() || id.includes('/') || id.length > 64) {
    throw new AppError('SUPPORT_BAD_ID', `Invalid ${label} id.`, 400);
  }
}

export function parseListStatus(status?: string): SupportStatus | SupportStatus[] | undefined {
  const raw = (status ?? '').trim();
  if (!raw) return undefined;
  if (raw === 'open') return OPEN_STATUSES;
  if (SINGLE_STATUSES.has(raw)) return raw as SupportStatus;
  return undefined;
}

export function parseListSubject(subject?: string): SupportSubject | undefined {
  const raw = (subject ?? '').trim();
  if (!raw || !SUBJECTS.has(raw)) return undefined;
  return raw as SupportSubject;
}

export function parseUnreadFlag(unread?: string): boolean | undefined {
  const raw = (unread ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return undefined;
}

export function toSupportMessage(m: {
  id: string;
  sender: SupportSender;
  text: string;
  createdAt: Date;
}) {
  return {
    id: m.id,
    sender: m.sender,
    text: m.text,
    createdAt: stamp(m.createdAt),
    createdAtMs: m.createdAt.getTime(),
  };
}

export function toSupportThreadRow(t: {
  id: string;
  name: string;
  email: string;
  subject: SupportSubject;
  status: SupportStatus;
  appVersion: string;
  deviceLabel: string;
  unread: boolean;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: string;
    sender: SupportSender;
    text: string;
    createdAt: Date;
  }[];
}) {
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
