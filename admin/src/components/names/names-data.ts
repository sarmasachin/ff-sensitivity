/** Names admin — mirrors Android StylishNameCatalog frames / letter styles. */

export type NamesTabId = "frames" | "fonts" | "policy";

export type NameFrameRow = {
  id: string;
  label: string;
  prefix: string;
  suffix: string;
  enabled: boolean;
  premium: boolean;
};

export type NameFontRow = {
  id: string;
  label: string;
  sample: string;
  enabled: boolean;
};

export type NameFrameFormValues = {
  id: string;
  label: string;
  prefix: string;
  suffix: string;
  enabled: boolean;
  premium: boolean;
};

export type NamesPolicy = {
  maxNameChars: number;
  maxBatchSize: number;
  blockSpaces: boolean;
  requireStyleWrap: boolean;
  remotePackUrl: string;
  remotePackEnabled: boolean;
};

export const NAMES_DEFAULT_POLICY: NamesPolicy = {
  maxNameChars: 12,
  maxBatchSize: 100,
  blockSpaces: true,
  requireStyleWrap: true,
  remotePackUrl: "",
  remotePackEnabled: false,
};

export function emptyFrameForm(): NameFrameFormValues {
  return {
    id: "",
    label: "",
    prefix: "",
    suffix: "",
    enabled: true,
    premium: false,
  };
}

export function frameToForm(row: NameFrameRow): NameFrameFormValues {
  return {
    id: row.id,
    label: row.label,
    prefix: row.prefix,
    suffix: row.suffix,
    enabled: row.enabled,
    premium: row.premium,
  };
}

export function formToFrame(
  values: NameFrameFormValues,
  fallbackId: string,
): NameFrameRow | { error: string } {
  const label = values.label.trim();
  const prefix = values.prefix;
  const suffix = values.suffix;
  if (!label) return { error: "Label is required." };
  if (!prefix && !suffix) {
    return { error: "Add at least a prefix or suffix." };
  }
  const id =
    values.id.trim().toLowerCase().replace(/\s+/g, "_") || fallbackId;
  if (!/^[a-z0-9_]+$/.test(id)) {
    return { error: "ID must be lowercase letters, numbers, underscores." };
  }
  if (prefix.length > 32 || suffix.length > 32) {
    return { error: "Prefix and suffix max 32 characters each." };
  }
  return {
    id,
    label,
    prefix,
    suffix,
    enabled: values.enabled,
    premium: values.premium,
  };
}

export function computeNamesStats(
  frames: NameFrameRow[],
  fonts: NameFontRow[],
) {
  const liveFrames = frames.filter((f) => f.enabled).length;
  const premium = frames.filter((f) => f.enabled && f.premium).length;
  const liveFonts = fonts.filter((f) => f.enabled).length;
  return {
    frames: frames.length,
    liveFrames,
    premium,
    fonts: fonts.length,
    liveFonts,
  };
}

export function previewTag(
  prefix: string,
  core: string,
  suffix: string,
): string {
  return `${prefix}${core}${suffix}`;
}

export const NAMES_CAPABILITIES = [
  {
    title: "Frame packs",
    body: "Prefix / suffix wraps around the player name — matches Android StylishNameCatalog frames.",
  },
  {
    title: "Letter fonts",
    body: "Caps, small caps, wide, bubbled — enable/disable which maps the Names tab can generate.",
  },
  {
    title: "FF limit",
    body: "Free Fire name max is 12 characters. Policy card controls batch size and space rules.",
  },
  {
    title: "Remote packs",
    body: "Optional https URL is admin-only. Android only pulls Nest GET /api/v1/names/catalog — never arbitrary URLs.",
  },
] as const;
