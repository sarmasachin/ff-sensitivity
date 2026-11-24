import { PrismaService } from '../prisma/prisma.service';
import { deviceFamilyKey } from './compare-promax-family';
import {
  resolveCommunityPull,
  type CommunityPull,
} from './compare-promax-community';
import {
  computeWeightedOffsets,
  type FieldAgreement,
  type PeerFieldOffsets,
} from './compare-promax-peer-quality';
import { buildProMaxTiers } from './compare-promax-tiers';

export type { FieldAgreement } from './compare-promax-peer-quality';

export type ProMaxOffsetQuery = {
  fingers?: string;
  role?: string;
  deviceLabel?: string;
  ramGb?: number;
  processorBrand?: string;
  processorType?: string;
  gpuLabel?: string;
  gpuVendor?: string;
  dpiPreference?: string;
  screenGuard?: string;
  refreshHz?: number;
  excludeUserId?: string;
  /** Peer product bucket: one_tap | promax (default = promax + legacy). */
  engine?: string;
};

export type SensitivityOffsets = PeerFieldOffsets;

export type ProMaxOffsetFrom =
  | 'device_hz_play'
  | 'device_play'
  | 'device_family_hz_play'
  | 'device_family_play'
  | 'chip_hz_play'
  | 'chip_play'
  | 'hw_play'
  | 'ram_play'
  | 'hz_play'
  | 'dpi_guard_play'
  | 'play'
  | 'all'
  | 'none';

export type ProMaxOffsetResult = {
  offsetFrom: ProMaxOffsetFrom | `${ProMaxOffsetFrom}_blend`;
  matchCount: number;
  confidence: number;
  averageOffsets: SensitivityOffsets;
  blendFrom?: ProMaxOffsetFrom;
  fieldAgreement?: FieldAgreement;
  /** Absolute soft targets from Community share codes (optional). */
  community?: CommunityPull;
};

type Scored = {
  name: ProMaxOffsetFrom;
  n: number;
  offsets: SensitivityOffsets;
  confidence: number;
  fieldAgreement: FieldAgreement;
};

const AGREE_ONE: FieldAgreement = {
  general: 1,
  redDot: 1,
  scope2x: 1,
  scope4x: 1,
  sniper: 1,
  freeLook: 1,
  fireButton: 1,
};

const ZERO: SensitivityOffsets = {
  general: 0,
  redDot: 0,
  scope2x: 0,
  scope4x: 0,
  sniper: 0,
  freeLook: 0,
  fireButton: 0,
};

/** Below this n, soft-mix with the next broader tier. */
const BLEND_BELOW_N = 5;

export { deviceFamilyKey } from './compare-promax-family';
export {
  computeWeightedOffsets,
  confidenceScale,
  dedupePeersByUser,
  feedbackSignConsistent,
} from './compare-promax-peer-quality';

export function ramBucket(ramGb: number): number {
  if (!Number.isFinite(ramGb) || ramGb <= 0) return 0;
  if (ramGb <= 2) return 2;
  if (ramGb <= 3) return 3;
  if (ramGb <= 4) return 4;
  if (ramGb < 8) return 6;
  if (ramGb < 12) return 8;
  return 12;
}

/** Panel max refresh bands for peer matching. */
export function refreshBucket(hz: number): number {
  if (!Number.isFinite(hz) || hz <= 0) return 0;
  if (hz <= 60) return 60;
  if (hz <= 90) return 90;
  if (hz <= 120) return 120;
  return 144;
}

export function cleanFilter(raw?: string, maxLen = 40): string {
  const value = String(raw ?? '').trim();
  if (!value || value.length > maxLen) return '';
  return value;
}

/** Soft-mix tight tier with broader tier when sample is thin. */
export function blendScored(primary: Scored, secondary: Scored): ProMaxOffsetResult {
  const pw = Math.min(0.85, 0.45 + 0.1 * primary.n);
  const sw = 1 - pw;
  const mix = (a: number, b: number) => Math.trunc(a * pw + b * sw);
  const mixA = (a: number, b: number) =>
    Math.round((a * pw + b * sw) * 100) / 100;
  return {
    offsetFrom: `${primary.name}_blend`,
    matchCount: primary.n + secondary.n,
    confidence: Math.min(
      1,
      Math.round((primary.confidence * pw + secondary.confidence * sw) * 100) / 100,
    ),
    blendFrom: secondary.name,
    fieldAgreement: {
      general: mixA(primary.fieldAgreement.general, secondary.fieldAgreement.general),
      redDot: mixA(primary.fieldAgreement.redDot, secondary.fieldAgreement.redDot),
      scope2x: mixA(primary.fieldAgreement.scope2x, secondary.fieldAgreement.scope2x),
      scope4x: mixA(primary.fieldAgreement.scope4x, secondary.fieldAgreement.scope4x),
      sniper: mixA(primary.fieldAgreement.sniper, secondary.fieldAgreement.sniper),
      freeLook: mixA(primary.fieldAgreement.freeLook, secondary.fieldAgreement.freeLook),
      fireButton: mixA(
        primary.fieldAgreement.fireButton,
        secondary.fieldAgreement.fireButton,
      ),
    },
    averageOffsets: {
      general: mix(primary.offsets.general, secondary.offsets.general),
      redDot: mix(primary.offsets.redDot, secondary.offsets.redDot),
      scope2x: mix(primary.offsets.scope2x, secondary.offsets.scope2x),
      scope4x: mix(primary.offsets.scope4x, secondary.offsets.scope4x),
      sniper: mix(primary.offsets.sniper, secondary.offsets.sniper),
      freeLook: mix(primary.offsets.freeLook, secondary.offsets.freeLook),
      fireButton: mix(primary.offsets.fireButton, secondary.offsets.fireButton),
    },
  };
}

function toResult(scored: Scored): ProMaxOffsetResult {
  return {
    offsetFrom: scored.name,
    matchCount: scored.n,
    confidence: scored.confidence,
    averageOffsets: scored.offsets,
    fieldAgreement: scored.fieldAgreement,
  };
}

/**
 * Waterfall + device-family fuzzy + low-n tier blend for Pro Max only.
 */
export async function resolveProMaxOffsets(
  prisma: PrismaService,
  query: ProMaxOffsetQuery,
): Promise<ProMaxOffsetResult> {
  const fingers = cleanFilter(query.fingers);
  const role = cleanFilter(query.role);
  const deviceLabel = cleanFilter(query.deviceLabel, 80);
  const family = deviceFamilyKey(deviceLabel);
  const processorBrand = cleanFilter(query.processorBrand);
  const processorType = cleanFilter(query.processorType, 80);
  const gpuLabel = cleanFilter(query.gpuLabel, 80);
  const gpuVendor = cleanFilter(query.gpuVendor);
  const dpiPreference = cleanFilter(query.dpiPreference);
  const screenGuard = cleanFilter(query.screenGuard);
  const excludeUserId = cleanFilter(query.excludeUserId, 64);
  const ramGbNum = Number(query.ramGb);
  const bucket = Number.isFinite(ramGbNum) && ramGbNum > 0 ? ramBucket(ramGbNum) : 0;
  const refreshHzNum = Number(query.refreshHz);
  const hzBucket =
    Number.isFinite(refreshHzNum) && refreshHzNum > 0
      ? refreshBucket(refreshHzNum)
      : 0;
  const nowMs = Date.now();
  const ex = excludeUserId || undefined;

  const tiers = buildProMaxTiers({
    prisma,
    fingers,
    role,
    deviceLabel,
    family,
    processorBrand,
    processorType,
    gpuLabel,
    gpuVendor,
    dpiPreference,
    screenGuard,
    bucket,
    hzBucket,
    ex,
    engine: query.engine,
  });

  const scoreTier = async (
    tier: (typeof tiers)[number],
  ): Promise<Scored | null> => {
    const peers = await tier.load();
    const scored = computeWeightedOffsets(peers, nowMs);
    if (scored.n < tier.minN) return null;
    return {
      name: tier.name,
      n: scored.n,
      offsets: scored.offsets,
      confidence: scored.confidence,
      fieldAgreement: scored.fieldAgreement,
    };
  };

  const community = await resolveCommunityPull(prisma, {
    role,
    deviceLabel,
    excludeUserId: ex,
  });

  const withCommunity = (result: ProMaxOffsetResult): ProMaxOffsetResult => ({
    ...result,
    community,
  });

  for (let i = 0; i < tiers.length; i++) {
    const primary = await scoreTier(tiers[i]);
    if (!primary) continue;

    if (primary.n >= BLEND_BELOW_N || i >= tiers.length - 1) {
      return withCommunity(toResult(primary));
    }

    const secondary = await scoreTier(tiers[i + 1]);
    if (secondary && secondary.n >= 1) {
      return withCommunity(blendScored(primary, secondary));
    }
    return withCommunity(toResult(primary));
  }

  return withCommunity({
    offsetFrom: 'none',
    matchCount: 0,
    confidence: 0,
    averageOffsets: { ...ZERO },
    fieldAgreement: { ...AGREE_ONE },
  });
}
