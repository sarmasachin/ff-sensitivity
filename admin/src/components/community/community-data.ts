/** Shared sensitivity posts — types + helpers (live via Nest). */

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
  createdAt?: string;
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
    title: "Live Nest sync",
    body: "Queue + actions hit /api/v1/admin/community — gated by community module.",
  },
] as const;
