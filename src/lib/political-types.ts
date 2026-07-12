/**
 * Client-safe types + view metadata for the Political dashboard.
 *
 * Kept separate from `political.ts` (which imports server-only data helpers)
 * so client components can import these without dragging server code into the
 * browser bundle.
 *
 * The Political dashboard sources its walk / call / fundraising lists from
 * DataStore **segments** built over a client's assigned master voter file
 * (see src/lib/political.ts). Each segment maps to a view via its `purpose`.
 */

export type PoliticalView = "walk" | "call" | "fundraising";

export const POLITICAL_VIEWS: PoliticalView[] = ["walk", "call", "fundraising"];

export const POLITICAL_VIEW_META: Record<
  PoliticalView,
  { label: string; blurb: string }
> = {
  walk: {
    label: "Walk",
    blurb: "Door-to-door canvass walk lists built from your master voter file.",
  },
  call: {
    label: "Call",
    blurb: "Phone-bank call lists built from your master voter file.",
  },
  fundraising: {
    label: "Fundraising",
    blurb: "Donor and fundraising lists built from your master voter file.",
  },
};

export interface PoliticalColumn {
  key: string;
  label: string;
}

/**
 * A single voter/record row inside a segment. `cells` are pre-stringified
 * scalar values keyed by column key so the table renders without further
 * type juggling on the client.
 */
export interface PoliticalRecordRow {
  /** Stable-ish key for React (index within the segment page). */
  id: string;
  cells: Record<string, string>;
}

/**
 * One walk / call / fundraising list, backed by a DataStore segment over the
 * client's master voter file.
 */
export interface PoliticalListRow {
  /** Segment UUID. */
  id: string;
  /** Segment display name. */
  name: string;
  /** Segment slug. */
  slug: string;
  /** Optional segment description. */
  description?: string;
  view: PoliticalView;
  /** Full resolved member count for the segment. */
  count: number;
  /** Columns to render (from the source store's canonical schema). */
  columns: PoliticalColumn[];
  /** A bounded preview of resolved rows for in-app display. */
  preview: PoliticalRecordRow[];
  /** True when more rows exist than the preview shows. */
  hasMore: boolean;
  /** Source DataStore name (the master voter file). */
  storeName: string;
  /** Source DataStore UUID — the master voter file store. */
  storeId: string;
  /** Owning client display name. */
  clientName?: string;
}

/**
 * A political voter-file DataStore with its row count.
 * Used for store-level stats (Change 1 — totals from master voter file).
 */
export interface PoliticalStore {
  id: string;
  name: string;
  kind: string;
  rowCount: number;
  clientName?: string;
  columns?: Array<{ key: string; label?: string }>;
}

// ── Voter-file analytics (Shiny app port) ───────────────────────────────────

export interface VoterAnalyticsBar {
  label: string;
  value: number;
  /** Single voter-file column key to filter a segment by (deep-link target). */
  filter_col?: string;
  /** Value for `filter_col` — combined as `filter=<col>:<val>` on the resolve API. */
  filter_val?: string;
}

export interface VoterAnalytics {
  scope: "voter_analytics";
  store_id: string;
  store_name: string;
  row_count: number;
  analyzed_rows: number;
  election_type: "primary" | "general";
  weight: "precinct" | "county";
  columns_resolved: Record<string, string>;
  official_party: VoterAnalyticsBar[];
  household_party: VoterAnalyticsBar[];
  gender: VoterAnalyticsBar[];
  county_counts: VoterAnalyticsBar[];
  frequency: VoterAnalyticsBar[];
  weighted_ranking: VoterAnalyticsBar[];
  age_histogram: VoterAnalyticsBar[];
  age_stats: {
    count: number;
    min: number | null;
    max: number | null;
    mean: number | null;
    median: number | null;
  };
}

/**
 * Parse a `filter=<col>:<val>` deep-link query param into a structured filter.
 * The value may itself contain colons; only the first colon is the separator.
 * Returns null when absent or malformed. Client-safe (no server imports).
 */
export function parseFilterParam(
  raw: string | undefined | null,
): { col: string; val: string } | null {
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx <= 0) return null;
  const col = raw.slice(0, idx).trim();
  const val = raw.slice(idx + 1).trim();
  if (!col || !val) return null;
  return { col, val };
}
