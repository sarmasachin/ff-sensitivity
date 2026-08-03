export type CopyTabId = "rate" | "share" | "about" | "legal";

export type CopyRateConfig = {
  enabled: boolean;
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
  minSessions: number;
};

export type CopyShareConfig = {
  sheetTitle: string;
  bodyTemplate: string;
  footerLine: string;
  hashtags: string;
};

export type CopyAboutConfig = {
  headline: string;
  blurb: string;
  versionPrefix: string;
  websiteCta: string;
  privacyCta: string;
};

export type CopyLegalConfig = {
  privacyLabel: string;
  termsLabel: string;
  supportLabel: string;
  storeLabel: string;
};

export type CopyRemoteConfig = {
  rate: CopyRateConfig;
  share: CopyShareConfig;
  about: CopyAboutConfig;
  legal: CopyLegalConfig;
};

export const COPY_DEFAULT_CONFIG: CopyRemoteConfig = {
  rate: {
    enabled: true,
    title: "Enjoying FF Sensitivity?",
    body: "A quick Play Store rating helps more players find accurate sensitivity settings.",
    primaryCta: "Rate on Play Store",
    secondaryCta: "Not now",
    minSessions: 3,
  },
  share: {
    sheetTitle: "Share sensitivity",
    bodyTemplate:
      "My Free Fire sensitivity for {{device}} — generated with FF Sensitivity.\n\n{{settings}}\n\nGet yours:",
    footerLine: "https://sensitivitysettings.com",
    hashtags: "#FreeFire #FFSensitivity",
  },
  about: {
    headline: "FF Sensitivity",
    blurb:
      "Device-aware Free Fire sensitivity, stylish names, daily challenges, and redeem tools — built for serious players.",
    versionPrefix: "Version",
    websiteCta: "Visit website",
    privacyCta: "View privacy policy",
  },
  legal: {
    privacyLabel: "Privacy policy",
    termsLabel: "Terms of use",
    supportLabel: "Contact support",
    storeLabel: "Rate on Google Play",
  },
};

export const COPY_CAPABILITIES = [
  {
    title: "Rate-app prompt",
    body: "Title, body, CTAs, and session gate pushed to Android without a store release.",
  },
  {
    title: "Share sheet",
    body: "Sensitivity share text templates with device/settings placeholders and footer URL.",
  },
  {
    title: "About blurbs",
    body: "About screen headline, description, and action labels for website / privacy.",
  },
  {
    title: "Legal labels",
    body: "Drawer and footer link labels — URLs stay on the App page; copy lives here.",
  },
  {
    title: "Validation",
    body: "Required fields and placeholder checks before publish so empty prompts never ship.",
  },
  {
    title: "Remote publish",
    body: "Nest CMS will push strings live to clients. UI is a local draft until then.",
  },
] as const;

export function computeCopyStats(config: CopyRemoteConfig) {
  const sections = 4;
  const rateOn = config.rate.enabled ? 1 : 0;
  const filled =
    (config.rate.title.trim() ? 1 : 0) +
    (config.share.bodyTemplate.trim() ? 1 : 0) +
    (config.about.blurb.trim() ? 1 : 0) +
    (config.legal.privacyLabel.trim() ? 1 : 0);
  const chars =
    config.rate.title.length +
    config.rate.body.length +
    config.share.bodyTemplate.length +
    config.about.blurb.length;
  return {
    sections,
    rateOn,
    filled,
    chars,
    minSessions: config.rate.minSessions,
  };
}

export function validateCopyRate(rate: CopyRateConfig): string | null {
  if (!rate.title.trim()) return "Rate prompt title is required.";
  if (!rate.body.trim()) return "Rate prompt body is required.";
  if (!rate.primaryCta.trim()) return "Primary CTA is required.";
  if (!rate.secondaryCta.trim()) return "Secondary CTA is required.";
  if (!Number.isFinite(rate.minSessions) || rate.minSessions < 1) {
    return "Min sessions must be ≥ 1.";
  }
  return null;
}

export function validateCopyShare(share: CopyShareConfig): string | null {
  if (!share.sheetTitle.trim()) return "Share sheet title is required.";
  if (!share.bodyTemplate.trim()) return "Share body template is required.";
  if (!share.bodyTemplate.includes("{{settings}}")) {
    return "Share body must include {{settings}} placeholder.";
  }
  if (!share.footerLine.trim()) return "Share footer line is required.";
  return null;
}

export function validateCopyAbout(about: CopyAboutConfig): string | null {
  if (!about.headline.trim()) return "About headline is required.";
  if (!about.blurb.trim()) return "About blurb is required.";
  if (!about.websiteCta.trim()) return "Website CTA label is required.";
  if (!about.privacyCta.trim()) return "Privacy CTA label is required.";
  return null;
}

export function validateCopyLegal(legal: CopyLegalConfig): string | null {
  if (!legal.privacyLabel.trim()) return "Privacy label is required.";
  if (!legal.termsLabel.trim()) return "Terms label is required.";
  if (!legal.supportLabel.trim()) return "Support label is required.";
  if (!legal.storeLabel.trim()) return "Store label is required.";
  return null;
}
