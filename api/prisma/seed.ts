import {
  PrismaClient,
  AdminRole,
  RedeemCodeStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const email = (process.env.SUPERADMIN_EMAIL ?? 'sharma.sachinctr@gmail.com')
    .trim()
    .toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD ?? '123456';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      email,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      allowedModules: [],
      isActive: true,
      mustChangePassword: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Super Admin ready: ${admin.email}`);

  // --- Start: Redeem live wire (Sachin) ---
  await prisma.redeemTypeDef.upsert({
    where: { id: 'GOOGLE_PLAY' },
    update: { label: 'Play Gift', enabled: true, sortOrder: 0 },
    create: {
      id: 'GOOGLE_PLAY',
      label: 'Play Gift',
      sortOrder: 0,
      enabled: true,
    },
  });
  await prisma.redeemTypeDef.upsert({
    where: { id: 'FF_DIAMONDS' },
    update: { label: 'FF Diamonds', enabled: true, sortOrder: 1 },
    create: {
      id: 'FF_DIAMONDS',
      label: 'FF Diamonds',
      sortOrder: 1,
      enabled: true,
    },
  });
  await prisma.redeemCadenceDef.upsert({
    where: { id: 'DAILY' },
    update: {
      label: 'Daily',
      claimLimit: 3,
      windowHours: 24,
      enabled: true,
      sortOrder: 0,
    },
    create: {
      id: 'DAILY',
      label: 'Daily',
      claimLimit: 3,
      windowHours: 24,
      sortOrder: 0,
      enabled: true,
    },
  });
  await prisma.redeemCadenceDef.upsert({
    where: { id: 'WEEKLY' },
    update: {
      label: 'Weekly',
      claimLimit: 2,
      windowHours: 168,
      enabled: true,
      sortOrder: 1,
    },
    create: {
      id: 'WEEKLY',
      label: 'Weekly',
      claimLimit: 2,
      windowHours: 168,
      sortOrder: 1,
      enabled: true,
    },
  });

  // Harden existing rows: one unique secret per unit (stockLeft must be 0 or 1).
  await prisma.redeemCode.updateMany({
    where: { stockLeft: { gt: 1 } },
    data: { stockLeft: 1 },
  });

  // Backfill expiresAt for active rows that never had a hard expiry.
  const in4h = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const in7d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.redeemCode.updateMany({
    where: {
      expiresAt: null,
      status: RedeemCodeStatus.ACTIVE,
      cadence: 'DAILY',
    },
    data: { expiresAt: in4h },
  });
  await prisma.redeemCode.updateMany({
    where: {
      expiresAt: null,
      status: RedeemCodeStatus.ACTIVE,
      cadence: 'WEEKLY',
    },
    data: { expiresAt: in7d },
  });

  const dummySecrets = [
    'ABCD-8X92-K12M-99PL',
    'ABCD-8X92-K12M-99P2',
    'FFDX-7K21-P90Q-44MZ',
    'USED-0000-0000-0001',
    'WEEK-9K21-M88P-12QT',
    'LOWX-7K21-P90Q-0001',
    'HOLD-9K21-M88P-55ZX',
  ];
  const removedDummy = await prisma.redeemCode.deleteMany({
    where: { codeSecret: { in: dummySecrets } },
  });
  // eslint-disable-next-line no-console
  console.log(`Dummy redeem secrets removed: ${removedDummy.count}`);
  // --- End: Redeem live wire (Sachin) ---

  // --- Start: Shop live wire (Sachin) ---
  const shopCategories = [
    { id: 'PRIZE', label: 'Prizes', sortOrder: 10, enabled: true, isBoost: false },
    { id: 'BOOST', label: 'Boosts', sortOrder: 20, enabled: true, isBoost: true },
    { id: 'UNLOCK', label: 'Unlocks', sortOrder: 30, enabled: true, isBoost: false },
    { id: 'PACK', label: 'Packs', sortOrder: 40, enabled: true, isBoost: false },
    { id: 'COSMETIC', label: 'Cosmetics', sortOrder: 50, enabled: true, isBoost: false },
  ];
  for (const cat of shopCategories) {
    await prisma.shopCategoryDef.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Shop categories upserted: ${shopCategories.length}`);

  // Live inventory only ? never re-seed demo catalog rows.
  const dummyShopIds = [
    'prize_google_play_gift',
    'prize_ff_diamonds',
    'prize_ffmax_diamonds',
    'prize_royale_pass',
    'prize_premium_skin',
    'boost_quiz_double',
    'boost_checkin_plus',
    'unlock_premium_badge',
    'unlock_elite_title',
    'pack_stylish_rare',
    'pack_scratch_bonus',
    'cosmetic_gold_wallet',
    'cosmetic_foil_obsidian',
  ];
  const removedShopDummy = await prisma.shopItem.deleteMany({
    where: { id: { in: dummyShopIds } },
  });
  // eslint-disable-next-line no-console
  console.log(`Dummy shop items removed: ${removedShopDummy.count}`);
  // --- End: Shop live wire (Sachin) ---

  // --- Start: Challenge live wire (Sachin) ---
  await prisma.challengeConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      missDayResetsStreak: true,
      requireCheckIn: true,
      requireQuiz: true,
      adBonusOptional: true,
      adBonusCooldownHours: 4,
      scratchCardsPerDay: 1,
      cardExpiresSameDay: true,
      firstMilestoneDays: 7,
      wrongAnswerLockHours: 4,
      wrongAnswerLockMinutes: 20,
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
    // eslint-disable-next-line no-console
    console.log(`Challenge quiz seeded (${quizSeed.length}).`);
  }

  const msCount = await prisma.challengeMilestone.count();
  if (msCount === 0) {
    const msSeed: Array<{
      id: string;
      days: number;
      title: string;
      rewardLabel: string;
      coinReward: number;
      badge: string | null;
    }> = [
      { id: 'm7', days: 7, title: 'Week Warrior', rewardLabel: '+50 coins ? Scratch', coinReward: 50, badge: null },
      { id: 'm15', days: 15, title: 'Rising Pro', rewardLabel: '+75 coins ? Scratch', coinReward: 75, badge: null },
      { id: 'm20', days: 20, title: 'Solid Start', rewardLabel: '+100 coins ? Scratch', coinReward: 100, badge: null },
      { id: 'm30', days: 30, title: 'Monthly Elite', rewardLabel: '+150 coins ? Badge ? Scratch', coinReward: 150, badge: 'Monthly Elite' },
      { id: 'm45', days: 45, title: 'Focus Fire', rewardLabel: '+200 coins ? Scratch', coinReward: 200, badge: null },
      { id: 'm60', days: 60, title: 'Two Month Ace', rewardLabel: '+250 coins ? Scratch', coinReward: 250, badge: null },
      { id: 'm75', days: 75, title: 'Sharp Shooter', rewardLabel: '+300 coins ? Scratch', coinReward: 300, badge: null },
      { id: 'm90', days: 90, title: 'Quarter Legend', rewardLabel: '+400 coins ? Badge ? Scratch', coinReward: 400, badge: 'Quarter Legend' },
      { id: 'm100', days: 100, title: 'Century Club', rewardLabel: '+500 coins ? Scratch', coinReward: 500, badge: null },
      { id: 'm120', days: 120, title: 'Iron Streak', rewardLabel: '+600 coins ? Scratch', coinReward: 600, badge: null },
      { id: 'm150', days: 150, title: 'Half-Year Heat', rewardLabel: '+750 coins ? Scratch', coinReward: 750, badge: null },
      { id: 'm180', days: 180, title: 'Season Master', rewardLabel: '+1000 coins ? Badge ? Scratch', coinReward: 1000, badge: 'Season Master' },
      { id: 'm200', days: 200, title: '200 Club', rewardLabel: '+1200 coins ? Scratch', coinReward: 1200, badge: null },
      { id: 'm240', days: 240, title: 'Unbroken', rewardLabel: '+1500 coins ? Scratch', coinReward: 1500, badge: null },
      { id: 'm260', days: 260, title: 'Hardcore', rewardLabel: '+1700 coins ? Scratch', coinReward: 1700, badge: null },
      { id: 'm290', days: 290, title: 'Near Immortal', rewardLabel: '+2000 coins ? Scratch', coinReward: 2000, badge: null },
      { id: 'm300', days: 300, title: '300 Crown', rewardLabel: '+2200 coins ? Badge ? Scratch', coinReward: 2200, badge: '300 Crown' },
      { id: 'm350', days: 350, title: 'Final Push', rewardLabel: '+2500 coins ? Scratch', coinReward: 2500, badge: null },
      { id: 'm360', days: 360, title: 'Almost Eternal', rewardLabel: '+2800 coins ? Scratch', coinReward: 2800, badge: null },
      { id: 'm365', days: 365, title: 'Year Legend', rewardLabel: '+5000 coins ? Legend ? Scratch', coinReward: 5000, badge: 'Year Legend' },
    ];
    await prisma.challengeMilestone.createMany({
      data: msSeed.map((m) => ({ ...m, enabled: true })),
    });
    // eslint-disable-next-line no-console
    console.log(`Challenge milestones seeded (${msSeed.length}).`);
  }
  // --- End: Challenge live wire (Sachin) ---

  // --- Start: Scratch live wire (Sachin) ---
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
  // Prize table is admin-managed — no dummy gift/milestone seed.
  // --- End: Scratch live wire (Sachin) ---

  // --- Start: Names live wire (Sachin) ---
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

  // Frames are admin-managed — no dummy catalog seed.

  const nameFontCount = await prisma.nameFont.count();
  if (nameFontCount === 0) {
    await prisma.nameFont.createMany({
      data: [
        { id: 'normal', label: 'Caps', sample: 'GHOST', enabled: true, sortOrder: 0 },
        { id: 'small_caps', label: 'Small Caps', sample: '???s?', enabled: true, sortOrder: 1 },
        { id: 'wide', label: 'Wide', sample: '?????', enabled: true, sortOrder: 2 },
        { id: 'bubbled', label: 'Bubbled', sample: '?????', enabled: true, sortOrder: 3 },
        {
          id: 'parenthesized',
          label: 'Parenthesized',
          sample: '??????????',
          enabled: false,
          sortOrder: 4,
        },
      ],
    });
    // eslint-disable-next-line no-console
    console.log('Name fonts seeded.');
  }
  // --- End: Names live wire (Sachin) ---

  // --- Start: Promos live wire (Sachin) ---
  // Promos are admin-managed — no dummy catalog seed.
  // --- End: Promos live wire (Sachin) ---

  // --- Start: Push live wire (Sachin) ---
  const pushCount = await prisma.pushCampaign.count();
  if (pushCount === 0) {
    const later = new Date();
    later.setDate(later.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    await prisma.pushCampaign.createMany({
      data: [
        {
          id: 'push_challenge_open',
          title: 'Daily Challenge is live',
          body: 'Quiz window is open ? claim coins before it closes.',
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
    // eslint-disable-next-line no-console
    console.log(`Push campaigns seeded (3) ? schedule example ${stamp(later)}.`);
  }
  // --- End: Push live wire (Sachin) ---

  // --- Start: App remote config live wire (Sachin) ---
  const appCfg = await prisma.appConfig.findUnique({ where: { id: 1 } });
  if (!appCfg) {
    await prisma.appConfig.create({
      data: {
        id: 1,
        maintenanceMode: false,
        maintenanceMessage:
          'We are performing scheduled maintenance. Please try again shortly.',
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
        adsJson: {
          calculate: {
            enabled: true,
            cooldownHours: 24,
            incompleteMessage: 'Watch the full ad to see your settings.',
            buttonLabel: 'Calculate Best Pro Settings ? Watch Ad',
          },
          dpi: {
            enabled: true,
            cooldownHours: 24,
            incompleteMessage:
              'Watch the full ad to see your DPI & Resolution result.',
            buttonLabel: 'DPI & Resolution Result ? Watch Ad',
          },
          quiz: {
            enabled: true,
            cooldownHours: 24,
            incompleteMessage: 'Watch the ad to submit the quiz.',
            buttonLabel: 'Submit Answer ? Watch Ad',
          },
          secondChance: {
            enabled: true,
            cooldownHours: 0,
            incompleteMessage: 'Watch the full ad to unlock a new question.',
            buttonLabel: 'Watch Ad for New Question',
          },
          adBonus: {
            enabled: true,
            cooldownHours: 4,
            incompleteMessage: 'Watch the full ad to claim bonus coins.',
            buttonLabel: 'Watch Ad for Bonus Coins',
          },
          checkIn: {
            enabled: true,
            cooldownHours: 24,
            incompleteMessage: 'Watch the ad to claim check-in.',
            buttonLabel: 'Collect +20 ? Watch Ad',
          },
          redeemDaily: {
            enabled: true,
            cooldownHours: 24,
            incompleteMessage: 'Watch the ad to open today?s redeem card.',
            buttonLabel: 'Redeem Now ? Watch Ad',
          },
        },
        playStoreUrl:
          'https://play.google.com/store/apps/details?id=com.ffsensitivity.app',
        privacyUrl: 'https://app.sensitivitysettings.com/privacy',
        websiteUrl: 'https://sensitivitysettings.com',
        supportEmail: 'support@sensitivitysettings.com',
      },
    });
    // eslint-disable-next-line no-console
    console.log('App remote config seeded.');
  }
  // --- End: App remote config live wire (Sachin) ---

  await prisma.$disconnect();
}

main().catch(async (e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
