"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProMaxTiers = buildProMaxTiers;
const compare_promax_family_1 = require("./compare-promax-family");
const compare_promax_peer_load_1 = require("./compare-promax-peer-load");
function buildProMaxTiers(input) {
    const { prisma, fingers, role, deviceLabel, family, processorBrand, processorType, gpuLabel, gpuVendor, dpiPreference, screenGuard, bucket, hzBucket, ex, engine, } = input;
    const tiers = [];
    const where = (base) => (0, compare_promax_peer_load_1.withPeerEngine)(base, engine, ex);
    if (deviceLabel && hzBucket > 0 && fingers && role) {
        tiers.push({
            name: 'device_hz_play',
            minN: 1,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ deviceLabel, refreshBucket: hzBucket, fingers, role })),
        });
    }
    if (deviceLabel && fingers && role) {
        tiers.push({
            name: 'device_play',
            minN: 1,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ deviceLabel, fingers, role })),
        });
    }
    if (family && hzBucket > 0 && fingers && role) {
        tiers.push({
            name: 'device_family_hz_play',
            minN: 2,
            load: async () => {
                const peers = await (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ fingers, role, refreshBucket: hzBucket }));
                return peers.filter((p) => (0, compare_promax_family_1.deviceFamilyKey)(p.deviceLabel) === family);
            },
        });
    }
    if (family && fingers && role) {
        tiers.push({
            name: 'device_family_play',
            minN: 2,
            load: async () => {
                const peers = await (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ fingers, role }));
                return peers.filter((p) => (0, compare_promax_family_1.deviceFamilyKey)(p.deviceLabel) === family);
            },
        });
    }
    if (processorType && gpuLabel && hzBucket > 0 && fingers && role) {
        tiers.push({
            name: 'chip_hz_play',
            minN: 2,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({
                processorType,
                gpuLabel,
                refreshBucket: hzBucket,
                fingers,
                role,
            })),
        });
    }
    if (processorType && gpuLabel && fingers && role) {
        tiers.push({
            name: 'chip_play',
            minN: 2,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ processorType, gpuLabel, fingers, role })),
        });
    }
    if (bucket > 0 && processorBrand && gpuVendor && fingers && role) {
        tiers.push({
            name: 'hw_play',
            minN: 2,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({
                ramBucket: bucket,
                processorBrand,
                gpuVendor,
                fingers,
                role,
            })),
        });
    }
    if (bucket > 0 && fingers && role) {
        tiers.push({
            name: 'ram_play',
            minN: 2,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ ramBucket: bucket, fingers, role })),
        });
    }
    if (hzBucket > 0 && fingers && role) {
        tiers.push({
            name: 'hz_play',
            minN: 2,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ refreshBucket: hzBucket, fingers, role })),
        });
    }
    if (dpiPreference && screenGuard && fingers && role) {
        tiers.push({
            name: 'dpi_guard_play',
            minN: 2,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ dpiPreference, screenGuard, fingers, role })),
        });
    }
    if (fingers && role) {
        tiers.push({
            name: 'play',
            minN: 1,
            load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({ fingers, role })),
        });
    }
    tiers.push({
        name: 'all',
        minN: 1,
        load: () => (0, compare_promax_peer_load_1.loadPeers)(prisma, where({})),
    });
    return tiers;
}
//# sourceMappingURL=compare-promax-tiers.js.map