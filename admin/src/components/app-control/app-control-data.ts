export type AppControlTabId =
  | "status"
  | "features"
  | "navigation"
  | "links";

export type AppFeatureKey =
  | "redeem"
  | "shop"
  | "challenge"
  | "scratch"
  | "share"
  | "names"
  | "community"
  | "support";

export type AppNavKey =
  | "homeRedeem"
  | "homeShop"
  | "homeChallenge"
  | "homeScratch"
  | "homeNames"
  | "homeShare"
  | "navCommunity"
  | "navSupport"
  | "navAbout";

export type AppFeatures = Record<AppFeatureKey, boolean>;
export type AppNavVisibility = Record<AppNavKey, boolean>;

export type AppStatusConfig = {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  forceUpdate: boolean;
  minVersionCode: number;
  minVersionName: string;
  softUpdatePrompt: boolean;
};

export type AppLinksConfig = {
  playStoreUrl: string;
  privacyUrl: string;
  websiteUrl: string;
  supportEmail: string;
};

export type AppRemoteConfig = {
  status: AppStatusConfig;
  features: AppFeatures;
  navigation: AppNavVisibility;
  links: AppLinksConfig;
};

export const APP_FEATURE_META: {
  key: AppFeatureKey;
  title: string;
  body: string;
}[] = [
  {
    key: "redeem",
    title: "Redeem",
    body: "Code redeem flow and inventory claims.",
  },
  {
    key: "shop",
    title: "Coin shop",
    body: "In-app coin packs and purchases.",
  },
  {
    key: "challenge",
    title: "Daily Challenge",
    body: "Quiz, streak, and milestone rewards.",
  },
  {
    key: "scratch",
    title: "Scratch cards",
    body: "Milestone and redeem scratch surfaces.",
  },
  {
    key: "share",
    title: "Share sensitivity",
    body: "Share card and export entry points.",
  },
  {
    key: "names",
    title: "Stylish Names",
    body: "Frames, fonts, and name studio tab.",
  },
  {
    key: "community",
    title: "Community",
    body: "Shared cards and community feed.",
  },
  {
    key: "support",
    title: "Contact / Support",
    body: "In-app Contact Us inbox entry.",
  },
];

export const APP_NAV_META: {
  key: AppNavKey;
  title: string;
  body: string;
  group: "home" | "drawer";
}[] = [
  {
    key: "homeRedeem",
    title: "Home · Redeem tile",
    body: "Show Redeem on the home grid.",
    group: "home",
  },
  {
    key: "homeShop",
    title: "Home · Shop tile",
    body: "Show Coin Shop on the home grid.",
    group: "home",
  },
  {
    key: "homeChallenge",
    title: "Home · Challenge tile",
    body: "Show Daily Challenge on home.",
    group: "home",
  },
  {
    key: "homeScratch",
    title: "Home · Scratch tile",
    body: "Show Scratch cards on home.",
    group: "home",
  },
  {
    key: "homeNames",
    title: "Home · Names tile",
    body: "Show Stylish Names on home.",
    group: "home",
  },
  {
    key: "homeShare",
    title: "Home · Share tile",
    body: "Show Share Sensitivity on home.",
    group: "home",
  },
  {
    key: "navCommunity",
    title: "Drawer · Community",
    body: "Community link in the side menu.",
    group: "drawer",
  },
  {
    key: "navSupport",
    title: "Drawer · Support",
    body: "Contact Us link in the side menu.",
    group: "drawer",
  },
  {
    key: "navAbout",
    title: "Drawer · About",
    body: "About / legal link in the side menu.",
    group: "drawer",
  },
];

export const APP_CAPABILITIES = [
  {
    title: "Maintenance & update",
    body: "Flip maintenance mode or force clients below min version to the Play Store.",
  },
  {
    title: "Feature kill-switches",
    body: "Disable Redeem, Shop, Challenge, Scratch, Share, Names, Community, Support without a store release.",
  },
  {
    title: "Home & nav visibility",
    body: "Hide home tiles or drawer links while the feature still exists for deep links.",
  },
  {
    title: "Store & legal links",
    body: "Play Store, privacy policy, website, and support email pushed to Android About / banners.",
  },
  {
    title: "Live Nest wire",
    body: "GET/PUT /api/v1/admin/app + public GET /api/v1/app/config for Android cold start.",
  },
] as const;

export const APP_DEFAULT_CONFIG: AppRemoteConfig = {
  status: {
    maintenanceMode: false,
    maintenanceMessage:
      "We are performing scheduled maintenance. Please try again shortly.",
    forceUpdate: false,
    minVersionCode: 1,
    minVersionName: "1.0.0",
    softUpdatePrompt: true,
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
      "https://play.google.com/store/apps/details?id=com.ffsensitivity.app",
    privacyUrl: "https://app.sensitivitysettings.com/privacy",
    websiteUrl: "https://sensitivitysettings.com",
    supportEmail: "support@sensitivitysettings.com",
  },
};

export function computeAppStats(config: AppRemoteConfig) {
  const featureKeys = Object.keys(config.features) as AppFeatureKey[];
  const navKeys = Object.keys(config.navigation) as AppNavKey[];
  const featuresOn = featureKeys.filter((k) => config.features[k]).length;
  const featuresOff = featureKeys.length - featuresOn;
  const navOn = navKeys.filter((k) => config.navigation[k]).length;
  const navOff = navKeys.length - navOn;
  return {
    featuresOn,
    featuresOff,
    navOn,
    navOff,
    maintenance: config.status.maintenanceMode,
    forceUpdate: config.status.forceUpdate,
    minVersion: config.status.minVersionName,
  };
}

export function validateAppLinks(
  links: AppLinksConfig,
): string | null {
  if (!links.playStoreUrl.trim().toLowerCase().startsWith("https://")) {
    return "Play Store URL must use https.";
  }
  if (!links.privacyUrl.trim().toLowerCase().startsWith("https://")) {
    return "Privacy URL must use https.";
  }
  if (!links.websiteUrl.trim().toLowerCase().startsWith("https://")) {
    return "Website URL must use https.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(links.supportEmail.trim())) {
    return "Support email looks invalid.";
  }
  return null;
}

export function validateAppStatus(status: AppStatusConfig): string | null {
  if (!Number.isFinite(status.minVersionCode) || status.minVersionCode < 1) {
    return "Min version code must be ≥ 1.";
  }
  if (!status.minVersionName.trim()) {
    return "Min version name is required.";
  }
  if (status.maintenanceMode && !status.maintenanceMessage.trim()) {
    return "Maintenance message is required when mode is on.";
  }
  return null;
}
