/** Shared sensitivity posts — moderation queue (local draft until API). */

export type CommunityStatus = "PENDING" | "APPROVED" | "FEATURED" | "HIDDEN";

export type CommunityListRow = {
  id: string;
  name: string;
  freeFireId: string;
  rank: string;
  role: string;
  deviceLabel: string;
  deviceMeta: string;
  matches: number;
  kills: number;
  headshots: number;
  general: number;
  redDot: number;
  scope2x: number;
  scope4x: number;
  awm: number;
  freeLook: number;
  status: CommunityStatus;
  reports: number;
  submittedLabel: string;
};

export function kdOf(row: Pick<CommunityListRow, "kills" | "matches">): string {
  if (row.matches <= 0) return "—";
  return (row.kills / row.matches).toFixed(2);
}

export function computeCommunityStats(rows: CommunityListRow[]) {
  return {
    pending: rows.filter((r) => r.status === "PENDING").length,
    live: rows.filter((r) => r.status === "APPROVED" || r.status === "FEATURED")
      .length,
    featured: rows.filter((r) => r.status === "FEATURED").length,
    flagged: rows.filter((r) => r.reports > 0 || r.status === "HIDDEN").length,
  };
}

export const COMMUNITY_STATUS_LABEL: Record<CommunityStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  FEATURED: "Featured",
  HIDDEN: "Hidden",
};

export const COMMUNITY_DEMO_ROWS: CommunityListRow[] = [
  {
    id: "c_pending_1",
    name: "Ravenシ",
    freeFireId: "3344556677",
    rank: "Heroic",
    role: "Rusher",
    deviceLabel: "Poco F6 Pro",
    deviceMeta: "12GB · 120Hz",
    matches: 1120,
    kills: 3890,
    headshots: 1540,
    general: 99,
    redDot: 91,
    scope2x: 80,
    scope4x: 70,
    awm: 54,
    freeLook: 112,
    status: "PENDING",
    reports: 0,
    submittedLabel: "12 min ago",
  },
  {
    id: "c_pending_2",
    name: "Toxic爪",
    freeFireId: "9988776655",
    rank: "Diamond",
    role: "Entry",
    deviceLabel: "Samsung A55",
    deviceMeta: "8GB · 120Hz",
    matches: 540,
    kills: 1210,
    headshots: 410,
    general: 108,
    redDot: 100,
    scope2x: 88,
    scope4x: 74,
    awm: 46,
    freeLook: 125,
    status: "PENDING",
    reports: 2,
    submittedLabel: "41 min ago",
  },
  {
    id: "c1",
    name: "SHADOW乂",
    freeFireId: "8123456789",
    rank: "Heroic",
    role: "Rusher",
    deviceLabel: "Samsung Galaxy S24 Ultra",
    deviceMeta: "12GB · 120Hz",
    matches: 1840,
    kills: 6120,
    headshots: 2840,
    general: 96,
    redDot: 88,
    scope2x: 78,
    scope4x: 68,
    awm: 52,
    freeLook: 110,
    status: "FEATURED",
    reports: 0,
    submittedLabel: "2 days ago",
  },
  {
    id: "c2",
    name: "VENOM♛",
    freeFireId: "9011223344",
    rank: "Diamond",
    role: "Sniper",
    deviceLabel: "iQOO Neo 9 Pro",
    deviceMeta: "12GB · 144Hz",
    matches: 920,
    kills: 3010,
    headshots: 1620,
    general: 84,
    redDot: 76,
    scope2x: 70,
    scope4x: 62,
    awm: 58,
    freeLook: 98,
    status: "APPROVED",
    reports: 0,
    submittedLabel: "3 days ago",
  },
  {
    id: "c3",
    name: "BLAZE⚡",
    freeFireId: "7788990011",
    rank: "Platinum",
    role: "Entry",
    deviceLabel: "Redmi Note 13 Pro+",
    deviceMeta: "8GB · 120Hz",
    matches: 640,
    kills: 1580,
    headshots: 710,
    general: 102,
    redDot: 94,
    scope2x: 82,
    scope4x: 70,
    awm: 48,
    freeLook: 120,
    status: "APPROVED",
    reports: 1,
    submittedLabel: "5 days ago",
  },
  {
    id: "c4",
    name: "NIGHT༒",
    freeFireId: "5566778899",
    rank: "Gold",
    role: "Support",
    deviceLabel: "Realme GT 6",
    deviceMeta: "8GB · 120Hz",
    matches: 410,
    kills: 890,
    headshots: 320,
    general: 90,
    redDot: 82,
    scope2x: 74,
    scope4x: 66,
    awm: 50,
    freeLook: 105,
    status: "HIDDEN",
    reports: 4,
    submittedLabel: "1 week ago",
  },
  {
    id: "c5",
    name: "ACE★PRO",
    freeFireId: "1122334455",
    rank: "Heroic",
    role: "Mixed",
    deviceLabel: "OnePlus 12R",
    deviceMeta: "16GB · 120Hz",
    matches: 2210,
    kills: 7450,
    headshots: 3910,
    general: 98,
    redDot: 90,
    scope2x: 80,
    scope4x: 72,
    awm: 55,
    freeLook: 115,
    status: "FEATURED",
    reports: 0,
    submittedLabel: "1 week ago",
  },
];

export const COMMUNITY_CAPABILITIES = [
  {
    title: "Approve / hide queue",
    body: "Staff review shared sensi cards before they appear in the Community tab.",
  },
  {
    title: "Feature posts",
    body: "Pin high-quality cards to the top of the in-app feed.",
  },
  {
    title: "Report triage",
    body: "Surface report counts and hide abusive or fake stats quickly.",
  },
  {
    title: "Sensi preview",
    body: "Inspect general / scopes / free look before approving.",
  },
  {
    title: "Device context",
    body: "See device + Hz so mods can spot impossible claims.",
  },
  {
    title: "API sync",
    body: "NestJS feed + moderation actions wire up next — UI is local draft.",
  },
] as const;
