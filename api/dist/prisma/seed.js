"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
async function main() {
    const prisma = new client_1.PrismaClient();
    const email = (process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com')
        .trim()
        .toLowerCase();
    const password = process.env.SUPERADMIN_PASSWORD ?? '123456';
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.upsert({
        where: { email },
        update: {
            role: client_1.AdminRole.SUPER_ADMIN,
            isActive: true,
        },
        create: {
            email,
            passwordHash,
            role: client_1.AdminRole.SUPER_ADMIN,
            allowedModules: [],
            isActive: true,
            mustChangePassword: true,
        },
    });
    console.log(`Super Admin ready: ${admin.email}`);
    await prisma.redeemCode.updateMany({
        where: { stockLeft: { gt: 1 } },
        data: { stockLeft: 1 },
    });
    const in4h = new Date(Date.now() + 4 * 60 * 60 * 1000);
    const in7d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.redeemCode.updateMany({
        where: {
            expiresAt: null,
            status: client_1.RedeemCodeStatus.ACTIVE,
            cadence: client_1.RedeemCadence.DAILY,
        },
        data: { expiresAt: in4h },
    });
    await prisma.redeemCode.updateMany({
        where: {
            expiresAt: null,
            status: client_1.RedeemCodeStatus.ACTIVE,
            cadence: client_1.RedeemCadence.WEEKLY,
        },
        data: { expiresAt: in7d },
    });
    const existing = await prisma.redeemCode.count();
    if (existing === 0) {
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        await prisma.redeemCode.createMany({
            data: [
                {
                    title: 'GOOGLE PLAY GIFT CARD',
                    type: client_1.RedeemType.GOOGLE_PLAY,
                    valueLabel: '₹50 INR',
                    codeSecret: 'ABCD-8X92-K12M-99PL',
                    status: client_1.RedeemCodeStatus.ACTIVE,
                    cadence: client_1.RedeemCadence.DAILY,
                    stockLeft: 1,
                    coinCost: null,
                    expiresLabel: 'In 4 Hours',
                    expiresAt: in4h,
                    tip: 'First Come, First Serve!',
                    redeemUrl: 'https://play.google.com/redeem',
                },
                {
                    title: 'GOOGLE PLAY GIFT CARD',
                    type: client_1.RedeemType.GOOGLE_PLAY,
                    valueLabel: '₹50 INR',
                    codeSecret: 'ABCD-8X92-K12M-99P2',
                    status: client_1.RedeemCodeStatus.ACTIVE,
                    cadence: client_1.RedeemCadence.DAILY,
                    stockLeft: 1,
                    coinCost: null,
                    expiresLabel: 'In 4 Hours',
                    expiresAt: in4h,
                    tip: 'First Come, First Serve!',
                    redeemUrl: 'https://play.google.com/redeem',
                },
                {
                    title: 'FREE FIRE DIAMONDS',
                    type: client_1.RedeemType.FF_DIAMONDS,
                    valueLabel: '100 Diamonds',
                    codeSecret: 'FFDX-7K21-P90Q-44MZ',
                    status: client_1.RedeemCodeStatus.ACTIVE,
                    cadence: client_1.RedeemCadence.DAILY,
                    stockLeft: 1,
                    coinCost: 1000,
                    expiresLabel: 'Valid till Midnight',
                    expiresAt: endOfDay,
                    tip: 'First Come, First Serve!',
                    redeemUrl: 'https://reward.ff.garena.com',
                },
                {
                    title: 'GOOGLE PLAY GIFT CARD',
                    type: client_1.RedeemType.GOOGLE_PLAY,
                    valueLabel: '₹10 INR',
                    codeSecret: 'USED-0000-0000-0001',
                    status: client_1.RedeemCodeStatus.EXHAUSTED,
                    cadence: client_1.RedeemCadence.DAILY,
                    stockLeft: 0,
                    coinCost: null,
                    expiresLabel: 'Expired',
                    expiresAt: new Date(Date.now() - 60_000),
                    tip: 'First Come, First Serve!',
                    redeemUrl: 'https://play.google.com/redeem',
                },
                {
                    title: 'GOOGLE PLAY GIFT CARD',
                    type: client_1.RedeemType.GOOGLE_PLAY,
                    valueLabel: '₹100 INR',
                    codeSecret: 'WEEK-9K21-M88P-12QT',
                    status: client_1.RedeemCodeStatus.ACTIVE,
                    cadence: client_1.RedeemCadence.WEEKLY,
                    stockLeft: 1,
                    coinCost: null,
                    expiresLabel: '7-day streak bonus',
                    expiresAt: in7d,
                    tip: 'Complete 7-day streak for a bigger chance!',
                    redeemUrl: 'https://play.google.com/redeem',
                },
            ],
        });
        console.log('Redeem codes seeded (5 rows, stockLeft=0|1).');
    }
    else {
        console.log(`Redeem codes already present: ${existing}`);
    }
    await prisma.challengeConfig.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            missDayResetsStreak: true,
            requireCheckIn: true,
            requireQuiz: true,
            adBonusOptional: true,
            scratchCardsPerDay: 1,
            cardExpiresSameDay: true,
            firstMilestoneDays: 7,
            wrongAnswerLockHours: 4,
            quizOpenWindowHours: 2,
            quizCorrectCoins: 50,
            quizWrongCoins: -10,
            checkinCoins: 20,
            adBonusCoins: 30,
        },
    });
    const quizCount = await prisma.challengeQuizQuestion.count();
    if (quizCount === 0) {
        const quizSeed = [
            {
                id: 'q1',
                question: 'Approx Free Fire nickname character limit is?',
                options: ['6', '12', '20', '30'],
                correctIndex: 1,
            },
            {
                id: 'q2',
                question: 'Which setting mainly affects aim drag feel?',
                options: ['DPI only', 'Sensitivity', 'Brightness', 'Volume'],
                correctIndex: 1,
            },
            {
                id: 'q3',
                question: 'Higher refresh rate usually means?',
                options: ['Smoother motion', 'More storage', 'Better battery always', 'Lower RAM'],
                correctIndex: 0,
            },
            {
                id: 'q4',
                question: 'Safe DPI tip helps avoid?',
                options: ['Friend requests', 'Crash / black screen risk', 'Name change', 'Clan join'],
                correctIndex: 1,
            },
            {
                id: 'q5',
                question: 'Red Dot sensitivity is usually set?',
                options: [
                    'Far above General',
                    'Near / slightly under General',
                    'Always 0',
                    'Only for snipers',
                ],
                correctIndex: 1,
            },
            {
                id: 'q6',
                question: 'HUD fire button size depends most on?',
                options: ['Wallpaper', 'Screen size + fingers', 'Clan level', 'Server ping only'],
                correctIndex: 1,
            },
            {
                id: 'q7',
                question: 'Best practice before sharing sensi?',
                options: ['Hide device info', 'Test in training', 'Set everything to 200', 'Disable touch'],
                correctIndex: 1,
            },
        ];
        await prisma.challengeQuizQuestion.createMany({
            data: quizSeed.map((q, i) => ({
                id: q.id,
                question: q.question,
                option0: q.options[0],
                option1: q.options[1],
                option2: q.options[2],
                option3: q.options[3],
                correctIndex: q.correctIndex,
                enabled: true,
                sortOrder: i,
            })),
        });
        console.log(`Challenge quiz seeded (${quizSeed.length}).`);
    }
    const msCount = await prisma.challengeMilestone.count();
    if (msCount === 0) {
        const msSeed = [
            { id: 'm7', days: 7, title: 'Week Warrior', rewardLabel: '+50 coins · Scratch', coinReward: 50, badge: null },
            { id: 'm15', days: 15, title: 'Rising Pro', rewardLabel: '+75 coins · Scratch', coinReward: 75, badge: null },
            { id: 'm20', days: 20, title: 'Solid Start', rewardLabel: '+100 coins · Scratch', coinReward: 100, badge: null },
            { id: 'm30', days: 30, title: 'Monthly Elite', rewardLabel: '+150 coins · Badge · Scratch', coinReward: 150, badge: 'Monthly Elite' },
            { id: 'm45', days: 45, title: 'Focus Fire', rewardLabel: '+200 coins · Scratch', coinReward: 200, badge: null },
            { id: 'm60', days: 60, title: 'Two Month Ace', rewardLabel: '+250 coins · Scratch', coinReward: 250, badge: null },
            { id: 'm75', days: 75, title: 'Sharp Shooter', rewardLabel: '+300 coins · Scratch', coinReward: 300, badge: null },
            { id: 'm90', days: 90, title: 'Quarter Legend', rewardLabel: '+400 coins · Badge · Scratch', coinReward: 400, badge: 'Quarter Legend' },
            { id: 'm100', days: 100, title: 'Century Club', rewardLabel: '+500 coins · Scratch', coinReward: 500, badge: null },
            { id: 'm120', days: 120, title: 'Iron Streak', rewardLabel: '+600 coins · Scratch', coinReward: 600, badge: null },
            { id: 'm150', days: 150, title: 'Half-Year Heat', rewardLabel: '+750 coins · Scratch', coinReward: 750, badge: null },
            { id: 'm180', days: 180, title: 'Season Master', rewardLabel: '+1000 coins · Badge · Scratch', coinReward: 1000, badge: 'Season Master' },
            { id: 'm200', days: 200, title: '200 Club', rewardLabel: '+1200 coins · Scratch', coinReward: 1200, badge: null },
            { id: 'm240', days: 240, title: 'Unbroken', rewardLabel: '+1500 coins · Scratch', coinReward: 1500, badge: null },
            { id: 'm260', days: 260, title: 'Hardcore', rewardLabel: '+1700 coins · Scratch', coinReward: 1700, badge: null },
            { id: 'm290', days: 290, title: 'Near Immortal', rewardLabel: '+2000 coins · Scratch', coinReward: 2000, badge: null },
            { id: 'm300', days: 300, title: '300 Crown', rewardLabel: '+2200 coins · Badge · Scratch', coinReward: 2200, badge: '300 Crown' },
            { id: 'm350', days: 350, title: 'Final Push', rewardLabel: '+2500 coins · Scratch', coinReward: 2500, badge: null },
            { id: 'm360', days: 360, title: 'Almost Eternal', rewardLabel: '+2800 coins · Scratch', coinReward: 2800, badge: null },
            { id: 'm365', days: 365, title: 'Year Legend', rewardLabel: '+5000 coins · Legend · Scratch', coinReward: 5000, badge: 'Year Legend' },
        ];
        await prisma.challengeMilestone.createMany({
            data: msSeed.map((m) => ({ ...m, enabled: true })),
        });
        console.log(`Challenge milestones seeded (${msSeed.length}).`);
    }
    await prisma.scratchConfig.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            coinsPercent: 55,
            redeemPercent: 45,
            coinAmount: 50,
            retentionDays: 30,
            autoPurge: true,
            showExpired: false,
        },
    });
    const scratchPrizeCount = await prisma.scratchPrize.count();
    if (scratchPrizeCount === 0) {
        await prisma.scratchPrize.createMany({
            data: [
                {
                    id: 'gift_coins_50',
                    title: 'Lucky +50',
                    detail: 'Small coin drop from the gift scratch pool.',
                    kind: 'GIFT',
                    rewardLabel: '+50 coins',
                    coinReward: 50,
                    oddsPercent: 35,
                    enabled: true,
                    sortOrder: 0,
                },
                {
                    id: 'gift_coins_150',
                    title: 'Lucky +150',
                    detail: 'Medium coin drop from the gift scratch pool.',
                    kind: 'GIFT',
                    rewardLabel: '+150 coins',
                    coinReward: 150,
                    oddsPercent: 20,
                    enabled: true,
                    sortOrder: 1,
                },
                {
                    id: 'gift_vault_hint',
                    title: 'Vault Hint',
                    detail: 'Foil tease — small coin consolation.',
                    kind: 'GIFT',
                    rewardLabel: '+10 coins',
                    coinReward: 10,
                    oddsPercent: 8,
                    enabled: true,
                    sortOrder: 2,
                },
                {
                    id: 'milestone_7',
                    title: 'Week Warrior',
                    detail: 'Day-7 streak scratch card grant.',
                    kind: 'MILESTONE',
                    rewardLabel: '+50 coins · Scratch',
                    coinReward: 50,
                    oddsPercent: 100,
                    enabled: true,
                    streakDays: 7,
                    sortOrder: 10,
                },
                {
                    id: 'redeem_unlock',
                    title: 'Redeem Unlock Foil',
                    detail: 'Scratch to reveal a claimed redeem gift code.',
                    kind: 'REDEEM',
                    rewardLabel: 'CODE',
                    coinReward: 0,
                    oddsPercent: 100,
                    enabled: true,
                    sortOrder: 20,
                },
                {
                    id: 'shop_token',
                    title: 'Shop Win Token',
                    detail: 'Archive entry from Bonus Scratch Token purchase.',
                    kind: 'SHOP',
                    rewardLabel: 'TOKEN',
                    coinReward: 0,
                    oddsPercent: 100,
                    enabled: true,
                    sortOrder: 30,
                },
            ],
        });
        console.log('Scratch prizes seeded.');
    }
    await prisma.namesConfig.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            maxNameChars: 12,
            maxBatchSize: 100,
            allowSpacesInInput: false,
            requireStyleWrap: true,
            remotePackEnabled: false,
            remotePackUrl: null,
        },
    });
    const nameFrameCount = await prisma.nameFrame.count();
    if (nameFrameCount === 0) {
        await prisma.nameFrame.createMany({
            data: [
                { id: 'classic', label: 'Classic', prefix: '꧁', suffix: '꧂', premium: true, enabled: true, sortOrder: 0 },
                { id: 'diamond', label: 'Diamond', prefix: '꧁༒', suffix: '༒꧂', premium: true, enabled: true, sortOrder: 1 },
                { id: 'tibetan', label: 'Tibetan', prefix: '꧁༺', suffix: '༻꧂', premium: true, enabled: true, sortOrder: 2 },
                { id: 'star_flow', label: 'Star Flow', prefix: '★彡', suffix: '彡★', premium: false, enabled: true, sortOrder: 3 },
                { id: 'jp_corner', label: 'JP Corner', prefix: '『', suffix: '』', premium: false, enabled: true, sortOrder: 4 },
                { id: 'square', label: 'Square', prefix: '【', suffix: '】', premium: false, enabled: true, sortOrder: 5 },
                { id: 'royal', label: 'Royal', prefix: '♛', suffix: '♛', premium: true, enabled: true, sortOrder: 6 },
                { id: 'skull', label: 'Skull', prefix: '☠', suffix: '☠', premium: true, enabled: true, sortOrder: 7 },
                { id: 'bolt', label: 'Bolt', prefix: '⚡', suffix: '⚡', premium: false, enabled: true, sortOrder: 8 },
                { id: 'blade', label: 'Blade', prefix: '⚔', suffix: '⚔', premium: true, enabled: true, sortOrder: 9 },
                { id: 'dark', label: 'Dark Elite', prefix: '꧁༒☬', suffix: '☬༒꧂', premium: true, enabled: true, sortOrder: 10 },
                { id: 'vip_tag', label: 'VIP Tag', prefix: '『VIP』', suffix: '', premium: false, enabled: true, sortOrder: 11 },
                { id: 'ff_tag', label: 'FF Tag', prefix: '『FF』', suffix: '', premium: false, enabled: false, sortOrder: 12 },
                { id: 'shadow', label: 'Shadow', prefix: '꧁丨', suffix: '丨꧂', premium: false, enabled: true, sortOrder: 13 },
                { id: 'clan', label: 'Clan Bars', prefix: '丨', suffix: '丨', premium: false, enabled: true, sortOrder: 14 },
            ],
        });
        console.log('Name frames seeded (15).');
    }
    const nameFontCount = await prisma.nameFont.count();
    if (nameFontCount === 0) {
        await prisma.nameFont.createMany({
            data: [
                { id: 'normal', label: 'Caps', sample: 'GHOST', enabled: true, sortOrder: 0 },
                { id: 'small_caps', label: 'Small Caps', sample: 'ɢʜᴏsᴛ', enabled: true, sortOrder: 1 },
                { id: 'wide', label: 'Wide', sample: 'ＧＨＯＳＴ', enabled: true, sortOrder: 2 },
                { id: 'bubbled', label: 'Bubbled', sample: 'ⒼⒽⓄⓈⓉ', enabled: true, sortOrder: 3 },
                {
                    id: 'parenthesized',
                    label: 'Parenthesized',
                    sample: '🄶🄷🄾🅂🅃',
                    enabled: false,
                    sortOrder: 4,
                },
            ],
        });
        console.log('Name fonts seeded.');
    }
    const promoCount = await prisma.promo.count();
    if (promoCount === 0) {
        const start = new Date();
        start.setMonth(start.getMonth() - 1);
        const end = new Date();
        end.setMonth(end.getMonth() + 2);
        await prisma.promo.createMany({
            data: [
                {
                    id: 'promo_challenge_week',
                    title: 'Daily Challenge week',
                    subtitle: 'Complete quizzes for bonus coins.',
                    imageLabel: 'challenge-hero',
                    deepLink: 'ffops://challenge',
                    placement: 'HOME_BANNER',
                    sortOrder: 1,
                    enabled: true,
                    startsAt: start,
                    endsAt: end,
                },
                {
                    id: 'promo_scratch_boost',
                    title: 'Scratch boost',
                    subtitle: 'Open your daily scratch after check-in.',
                    imageLabel: 'scratch-gold',
                    deepLink: 'ffops://scratch',
                    placement: 'HOME_BANNER',
                    sortOrder: 2,
                    enabled: true,
                    startsAt: start,
                    endsAt: end,
                },
                {
                    id: 'promo_shop_pack',
                    title: 'Coin shop pack',
                    subtitle: 'Spend coins on packs & unlocks.',
                    imageLabel: 'shop-pack',
                    deepLink: 'ffops://shop',
                    placement: 'HOME_STRIP',
                    sortOrder: 3,
                    enabled: true,
                    startsAt: start,
                    endsAt: end,
                },
                {
                    id: 'promo_names_frames',
                    title: 'Stylish Names',
                    subtitle: 'New frames in the catalog.',
                    imageLabel: 'names-frames',
                    deepLink: 'ffops://names',
                    placement: 'HOME_STRIP',
                    sortOrder: 4,
                    enabled: true,
                    startsAt: start,
                    endsAt: end,
                },
            ],
        });
        console.log('Promos seeded (4).');
    }
    const pushCount = await prisma.pushCampaign.count();
    if (pushCount === 0) {
        const later = new Date();
        later.setDate(later.getDate() + 1);
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        await prisma.pushCampaign.createMany({
            data: [
                {
                    id: 'push_challenge_open',
                    title: 'Daily Challenge is live',
                    body: 'Quiz window is open — claim coins before it closes.',
                    deepLink: 'ffops://challenge',
                    audience: 'ACTIVE_7D',
                    topic: '',
                    status: 'DRAFT',
                    createdBy: 'seed',
                },
                {
                    id: 'push_scratch_weekend',
                    title: 'Scratch boost weekend',
                    body: 'Higher redeem odds on milestone cards through Sunday.',
                    deepLink: 'ffops://scratch',
                    audience: 'ALL',
                    topic: '',
                    status: 'SCHEDULED',
                    scheduledAt: later,
                    createdBy: 'seed',
                },
                {
                    id: 'push_names_frames',
                    title: 'New Stylish Name frames',
                    body: 'Premium wraps just landed. Try them in Names.',
                    deepLink: 'ffops://names',
                    audience: 'TOPIC',
                    topic: 'feature_names',
                    status: 'DRAFT',
                    createdBy: 'seed',
                },
            ],
        });
        console.log(`Push campaigns seeded (3) — schedule example ${stamp(later)}.`);
    }
    const appCfg = await prisma.appConfig.findUnique({ where: { id: 1 } });
    if (!appCfg) {
        await prisma.appConfig.create({
            data: {
                id: 1,
                maintenanceMode: false,
                maintenanceMessage: 'We are performing scheduled maintenance. Please try again shortly.',
                forceUpdate: false,
                softUpdatePrompt: true,
                minVersionCode: 1,
                minVersionName: '1.0.0',
                featuresJson: {
                    redeem: true,
                    shop: true,
                    challenge: true,
                    scratch: true,
                    share: true,
                    names: true,
                    community: true,
                    support: true,
                },
                navigationJson: {
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
                playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ffsensitivity.app',
                privacyUrl: 'https://sensitivitysettings.com/privacy-policy',
                websiteUrl: 'https://sensitivitysettings.com',
                supportEmail: 'support@sensitivitysettings.com',
            },
        });
        console.log('App remote config seeded.');
    }
    await prisma.$disconnect();
}
main().catch(async (e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map