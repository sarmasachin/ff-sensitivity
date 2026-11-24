import { PrismaService } from '../prisma/prisma.service';
import { deviceFamilyKey } from './compare-promax-family';
import { loadPeers, withPeerEngine } from './compare-promax-peer-load';
import type { PeerOffsetRow } from './compare-promax-peer-quality';
import type { ProMaxOffsetFrom } from './compare-promax-offset';

export type ProMaxTier = {
  name: ProMaxOffsetFrom;
  minN: number;
  load: () => Promise<PeerOffsetRow[]>;
};

export type ProMaxTierInput = {
  prisma: PrismaService;
  fingers: string;
  role: string;
  deviceLabel: string;
  family: string;
  processorBrand: string;
  processorType: string;
  gpuLabel: string;
  gpuVendor: string;
  dpiPreference: string;
  screenGuard: string;
  bucket: number;
  hzBucket: number;
  ex: string | undefined;
  /** one_tap | promax (default promax/legacy). */
  engine?: string;
};

/** Deep waterfall tiers — engine bucket applied on every peer load. */
export function buildProMaxTiers(input: ProMaxTierInput): ProMaxTier[] {
  const {
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
    engine,
  } = input;
  const tiers: ProMaxTier[] = [];
  const where = (base: Record<string, unknown>) =>
    withPeerEngine(base, engine, ex);

  // Tighter than plain device: exact model + refresh band.
  if (deviceLabel && hzBucket > 0 && fingers && role) {
    tiers.push({
      name: 'device_hz_play',
      minN: 1,
      load: () =>
        loadPeers(
          prisma,
          where({ deviceLabel, refreshBucket: hzBucket, fingers, role }),
        ),
    });
  }

  if (deviceLabel && fingers && role) {
    tiers.push({
      name: 'device_play',
      minN: 1,
      load: () => loadPeers(prisma, where({ deviceLabel, fingers, role })),
    });
  }

  // Family + refresh band before broad family (60 vs 120 mix kam).
  if (family && hzBucket > 0 && fingers && role) {
    tiers.push({
      name: 'device_family_hz_play',
      minN: 2,
      load: async () => {
        const peers = await loadPeers(
          prisma,
          where({ fingers, role, refreshBucket: hzBucket }),
        );
        return peers.filter((p) => deviceFamilyKey(p.deviceLabel) === family);
      },
    });
  }

  if (family && fingers && role) {
    tiers.push({
      name: 'device_family_play',
      minN: 2,
      load: async () => {
        const peers = await loadPeers(prisma, where({ fingers, role }));
        return peers.filter((p) => deviceFamilyKey(p.deviceLabel) === family);
      },
    });
  }

  // Tighter than plain chip: same SoC/GPU + refresh band (90/120Hz etc.).
  if (processorType && gpuLabel && hzBucket > 0 && fingers && role) {
    tiers.push({
      name: 'chip_hz_play',
      minN: 2,
      load: () =>
        loadPeers(
          prisma,
          where({
            processorType,
            gpuLabel,
            refreshBucket: hzBucket,
            fingers,
            role,
          }),
        ),
    });
  }

  if (processorType && gpuLabel && fingers && role) {
    tiers.push({
      name: 'chip_play',
      minN: 2,
      load: () =>
        loadPeers(prisma, where({ processorType, gpuLabel, fingers, role })),
    });
  }

  if (bucket > 0 && processorBrand && gpuVendor && fingers && role) {
    tiers.push({
      name: 'hw_play',
      minN: 2,
      load: () =>
        loadPeers(
          prisma,
          where({
            ramBucket: bucket,
            processorBrand,
            gpuVendor,
            fingers,
            role,
          }),
        ),
    });
  }

  if (bucket > 0 && fingers && role) {
    tiers.push({
      name: 'ram_play',
      minN: 2,
      load: () =>
        loadPeers(prisma, where({ ramBucket: bucket, fingers, role })),
    });
  }

  if (hzBucket > 0 && fingers && role) {
    tiers.push({
      name: 'hz_play',
      minN: 2,
      load: () =>
        loadPeers(prisma, where({ refreshBucket: hzBucket, fingers, role })),
    });
  }

  if (dpiPreference && screenGuard && fingers && role) {
    tiers.push({
      name: 'dpi_guard_play',
      minN: 2,
      load: () =>
        loadPeers(
          prisma,
          where({ dpiPreference, screenGuard, fingers, role }),
        ),
    });
  }

  if (fingers && role) {
    tiers.push({
      name: 'play',
      minN: 1,
      load: () => loadPeers(prisma, where({ fingers, role })),
    });
  }

  tiers.push({
    name: 'all',
    minN: 1,
    load: () => loadPeers(prisma, where({})),
  });

  return tiers;
}
