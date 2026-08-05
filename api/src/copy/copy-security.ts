import { AppError } from '../common/errors/app-error';
import { assertSafeHttpsUrl } from '../app-config/app-config-security';

// --- Start: Copy CMS live wire (Sachin) ---
export function sanitizeCopyText(raw: string, max: number): string {
  return [...(raw ?? '')]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      if (code === 0xfeff) return false;
      return true;
    })
    .join('')
    .trim()
    .slice(0, max);
}

/** Allow newlines in multi-line marketing copy. */
export function sanitizeCopyMultiline(raw: string, max: number): string {
  return [...(raw ?? '')]
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      if (ch === '\n' || ch === '\r') return true;
      if (code < 0x20 || code === 0x7f) return false;
      if (code >= 0x200b && code <= 0x200f) return false;
      if (code === 0xfeff) return false;
      return true;
    })
    .join('')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
    .slice(0, max);
}

export function assertSafeCopyText(text: string, field: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes('javascript:') ||
    lower.includes('data:text/html') ||
    /<script[\s>]/i.test(text)
  ) {
    throw new AppError(
      'COPY_UNSAFE_TEXT',
      `${field} contains disallowed content.`,
      400,
    );
  }
}

/** Footer may be plain text or https URL — never http / private hosts. */
export function assertSafeFooterLine(raw: string): string {
  const text = sanitizeCopyText(raw, 300);
  if (!text) {
    throw new AppError('COPY_BAD_FOOTER', 'Share footer line is required.', 400);
  }
  assertSafeCopyText(text, 'Share footer');
  if (/^https?:\/\//i.test(text)) {
    return assertSafeHttpsUrl(text, 'Share footer');
  }
  return text;
}

export function assertAllowedPlaceholders(template: string) {
  const found = template.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g) ?? [];
  for (const token of found) {
    const key = token.replace(/[{}]/g, '').trim();
    if (key !== 'device' && key !== 'settings') {
      throw new AppError(
        'COPY_BAD_PLACEHOLDER',
        `Unknown placeholder {{${key}}}. Only {{device}} and {{settings}} are allowed.`,
        400,
      );
    }
  }
}

/** Collapse {{ device }} → {{device}} so clients can match exact tokens. */
export function normalizePlaceholders(template: string): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_m, key: string) => `{{${key}}}`,
  );
}

export const DEFAULT_COPY_CONFIG = {
  rate: {
    enabled: true,
    title: 'Enjoying FF Sensitivity?',
    body: 'A quick Play Store rating helps more players find accurate sensitivity settings.',
    primaryCta: 'Rate on Play Store',
    secondaryCta: 'Not now',
    minSessions: 3,
  },
  share: {
    sheetTitle: 'Share sensitivity',
    bodyTemplate:
      'My Free Fire sensitivity for {{device}} — generated with FF Sensitivity.\n\n{{settings}}\n\nGet yours:',
    footerLine: 'https://sensitivitysettings.com',
    hashtags: '#FreeFire #FFSensitivity',
  },
  about: {
    headline: 'FF Sensitivity',
    blurb:
      'Device-aware Free Fire sensitivity, stylish names, daily challenges, and redeem tools — built for serious players.',
    versionPrefix: 'Version',
    websiteCta: 'Visit website',
    privacyCta: 'View privacy policy',
  },
  legal: {
    privacyLabel: 'Privacy policy',
    termsLabel: 'Terms of use',
    supportLabel: 'Contact support',
    storeLabel: 'Rate on Google Play',
  },
};
// --- End: Copy CMS live wire (Sachin) ---
