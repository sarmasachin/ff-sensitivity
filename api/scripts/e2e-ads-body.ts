/** Shared ads PUT body for e2e-ads (keeps e2e-ads.ts under line budget). */

export function adsBody(opts?: {
  calculate?: Record<string, unknown>;
  dpi?: Record<string, unknown>;
  quiz?: Record<string, unknown>;
  secondChance?: Record<string, unknown>;
  adBonus?: Record<string, unknown>;
  checkIn?: Record<string, unknown>;
  redeemDaily?: Record<string, unknown>;
}) {
  return {
    calculate: {
      enabled: true,
      cooldownHours: 24,
      incompleteMessage: 'Watch the full ad to see your settings.',
      buttonLabel: 'Calculate Best Pro Settings \u00b7 Watch Ad',
      ...(opts?.calculate ?? {}),
    },
    dpi: {
      enabled: true,
      cooldownHours: 24,
      incompleteMessage:
        'Watch the full ad to see your DPI & Resolution result.',
      buttonLabel: 'DPI & Resolution Result \u00b7 Watch Ad',
      ...(opts?.dpi ?? {}),
    },
    quiz: {
      enabled: true,
      cooldownHours: 24,
      incompleteMessage: 'Watch the ad to submit the quiz.',
      buttonLabel: 'Submit Answer \u00b7 Watch Ad',
      ...(opts?.quiz ?? {}),
    },
    secondChance: {
      enabled: true,
      cooldownHours: 0,
      incompleteMessage: 'Watch the full ad to unlock a new question.',
      buttonLabel: 'Watch Ad for New Question',
      ...(opts?.secondChance ?? {}),
    },
    adBonus: {
      enabled: true,
      cooldownHours: 4,
      incompleteMessage: 'Watch the full ad to claim bonus coins.',
      buttonLabel: 'Watch Ad for Bonus Coins',
      ...(opts?.adBonus ?? {}),
    },
    checkIn: {
      enabled: true,
      cooldownHours: 24,
      incompleteMessage: 'Watch the ad to claim check-in.',
      buttonLabel: 'Collect +20 \u00b7 Watch Ad',
      ...(opts?.checkIn ?? {}),
    },
    redeemDaily: {
      enabled: true,
      cooldownHours: 24,
      incompleteMessage: 'Watch the ad to open today’s redeem card.',
      buttonLabel: 'Redeem Now \u00b7 Watch Ad',
      ...(opts?.redeemDaily ?? {}),
    },
  };
}

export function appBase() {
  return {
    status: {
      maintenanceMode: false,
      maintenanceMessage: 'We are performing scheduled maintenance.',
      forceUpdate: false,
      softUpdatePrompt: true,
      minVersionCode: 1,
      minVersionName: '1.0.0',
    },
    features: {
      redeem: true,
      shop: true,
      challenge: true,
      scratch: true,
      share: true,
      names: true,
      community: true,
      support: true,
    },
    navigation: {
      homeRedeem: true,
      homeShop: true,
      homeChallenge: true,
      homeScratch: true,
      homeNames: true,
      homeShare: true,
      navCommunity: true,
      navSupport: true,
      navAbout: true,
    },
    links: {
      playStoreUrl:
        'https://play.google.com/store/apps/details?id=com.ffsensitivity.app',
      privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
      websiteUrl: 'https://sensitivitysettings.com',
      supportEmail: 'support@sensitivitysettings.com',
    },
  };
}
