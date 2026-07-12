import { apiGet, apiList } from "@/lib/api";
import { getScopeContext, type ScopeContext } from "@/lib/scope";
import type { Client } from "@/types/api";
import {
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
  type PoliticalView,
  type PoliticalColumn,
  type PoliticalListRow,
  type PoliticalRecordRow,
  type PoliticalStore,
  type VoterAnalytics,
  type VoterAnalyticsBar,
} from "@/lib/political-types";

export {
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
  type PoliticalView,
  type PoliticalColumn,
  type PoliticalListRow,
  type PoliticalRecordRow,
  type PoliticalStore,
  type VoterAnalytics,
  type VoterAnalyticsBar,
};

/**
 * Political dashboard data layer.
 *
 * The Political tab surfaces the walk / call / fundraising lists a client's
 * field program runs off of. Those lists are DataStore **segments** built over
 * the client's assigned master voter file:
 *
 *   Client → DataStore (kind=voter_file, the master voter file)
 *          → Segment   (purpose = walk | call | fundraising | sms)
 *          → resolved member rows (the actual voters/donors)
 *
 * We rebuild each view directly from those segments instead of from tagged
 * deliverable files. The pipeline per active scope:
 *
 *   1. list the scope's voter-file DataStores        (/datastore/stores/)
 *   2. list each store's segments                     (/datastore/segments/?store=)
 *   3. bucket segments by `purpose` into the 3 views
 *   4. resolve a bounded preview of rows per segment  (/segments/<id>/resolve/)
 *
 * Full CSV export streams straight from the backend segment `export` endpoint
 * (authed blob download on the client — see political-list-view.tsx).
 */

// ── Backend DataStore shapes (subset we consume) ────────────────────────────

interface DataStoreColumn {
  key: string;
  label?: string;
  type?: string;
  sample?: unknown;
}

interface DataStore {
  id: string;
  client: string; // client UUID
  name: string;
  slug: string;
  kind: string; // "voter_file" | "donor_file" | ...
  columns?: DataStoreColumn[] | null;
  row_count?: number;
  status?: string;
}

interface Segment {
  id: string;
  store: string; // store UUID
  name: string;
  slug: string;
  description?: string;
  purpose: string; // "walk" | "call" | "fundraising" | "sms" | ...
  count?: number;
  is_live?: boolean;
}

interface ResolveResponse {
  count: number;
  results: Record<string, unknown>[];
}

/**
 * Minimal server fetch to get an accurate count per segment.
 * The interactive SegmentTable fetches its own pages from the API proxy;
 * we no longer ship preview rows in the RSC payload. Use limit=1 so the
 * resolve endpoint returns the filtered total count with minimal data.
 */
const PREVIEW_LIMIT = 1;

/** Voter/donor store kinds that back a political field program. */
const POLITICAL_STORE_KINDS = new Set(["voter_file", "donor_file", "contact_file"]);

/**
 * Map a segment `purpose` onto a dashboard view.
 *
 * Explicit field-channel purposes win. The DataStore also supports broader
 * program purposes (`generic` canvass segments, `sms`/phone segments, `donor`)
 * — we fold those onto the closest field view so a client's existing voter-file
 * segments populate the walk / call / fundraising tabs without re-seeding:
 *
 *   walk        ← walk | canvass | door | generic (general canvass universes)
 *   call        ← call | phone | sms | text
 *   fundraising ← fundraising | donor | finance
 *
 * Anything unrecognised is hidden from this dashboard.
 */
function purposeToView(purpose: unknown): PoliticalView | null {
  if (typeof purpose !== "string") return null;
  const p = purpose.trim().toLowerCase();
  if ((POLITICAL_VIEWS as string[]).includes(p)) return p as PoliticalView;
  if (["canvass", "door", "generic", "walklist", "walk_list"].includes(p)) {
    return "walk";
  }
  if (["phone", "sms", "text", "calllist", "call_list"].includes(p)) {
    return "call";
  }
  if (["donor", "finance", "fund", "fundraise"].includes(p)) {
    return "fundraising";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Niche gating — only surface Political for political/public-affairs clients
// (unchanged: still gates the nav link + route)
// ---------------------------------------------------------------------------

const POLITICAL_NICHE_MATCHERS = [
  "political",
  "public affairs",
  "public-affairs",
  "public_affairs",
  "publicaffairs",
];

const NICHE_KEYS = ["niche", "industry", "vertical", "sector", "category"];

function collectNicheStrings(bag?: Record<string, unknown>): string[] {
  if (!bag) return [];
  const out: string[] = [];
  for (const key of NICHE_KEYS) {
    const v = bag[key];
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) {
      for (const item of v) if (typeof item === "string") out.push(item);
    }
  }
  const tags = bag.tags;
  if (Array.isArray(tags)) {
    for (const t of tags) if (typeof t === "string") out.push(t);
  }
  return out;
}

/** True when a single client's meta/brand_info marks it political/public-affairs. */
export function clientIsPolitical(client: Client): boolean {
  const strings = [
    ...collectNicheStrings(client.meta),
    ...collectNicheStrings(client.brand_info),
  ].map((s) => s.toLowerCase());
  return strings.some((s) =>
    POLITICAL_NICHE_MATCHERS.some((m) => s.includes(m)),
  );
}

/**
 * True when the ACTIVE scope includes at least one political/public-affairs
 * client. Gates the Political nav link + route.
 */
export function scopeHasPoliticalNiche(ctx: ScopeContext): boolean {
  const { active, clients } = ctx;

  let relevant: Client[];
  if (active.type === "client") {
    relevant = clients.filter((c) => c.id === active.id);
  } else if (active.type === "partner") {
    relevant = clients.filter((c) => c.partner === active.id);
  } else {
    relevant = clients;
  }

  return relevant.some(clientIsPolitical);
}

// ── Row / column shaping ────────────────────────────────────────────────────

function scalarToString(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return ""; // skip objects/arrays — not scalar cell data
}

function titleize(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/**
 * Choose the columns to render for a voter-file segment. Uses the source
 * store's canonical column order (source CSV order) so the preview matches the
 * exported CSV. Trimmed to a readable lead set; the full CSV export keeps every
 * column.
 */
function deriveColumns(store: DataStore): PoliticalColumn[] {
  const declared = (store.columns ?? []).filter((c) => c && c.key);

  // Prefer a compact, human-friendly lead set when the source uses the known
  // GOPDC voter-file schema; otherwise fall back to the first N store columns.
  const PREFERRED_ORDER = [
    "LastName",
    "FirstName",
    "OfficialParty",
    // Residence / address (GOPDC master-voter-file schema)
    "PrimaryAddress1",
    "ResidenceAddress",
    "Address",
    "PrimaryCity",
    "ResidenceCity",
    "City",
    "PrimaryZip",
    "Zip",
    "ZipCode",
    // Contact
    "PrimaryPhone",
    "Phone",
    "Mobile",
    "EMail",
    // Geography / turnout
    "PrecinctName",
    "CountyName",
    "GeneralFrequency",
    "PrimaryFrequency",
  ];

  const available = new Map(declared.map((c) => [c.key, c] as const));
  const picked: PoliticalColumn[] = [];
  for (const key of PREFERRED_ORDER) {
    const col = available.get(key);
    if (col) {
      picked.push({ key: col.key, label: col.label || titleize(col.key) });
      available.delete(key);
    }
  }

  if (picked.length >= 3) return picked;

  // Fallback: first 12 store columns in canonical order.
  return declared
    .slice(0, 12)
    .map((c) => ({ key: c.key, label: c.label || titleize(c.key) }));
}

function recordsToRows(
  records: Record<string, unknown>[],
  columns: PoliticalColumn[],
): PoliticalRecordRow[] {
  return records.map((rec, i) => {
    const cells: Record<string, string> = {};
    for (const col of columns) cells[col.key] = scalarToString(rec[col.key]);
    return { id: `${i}`, cells };
  });
}

// ── Main data fetch ─────────────────────────────────────────────────────────

/**
 * Fetch every scoped voter-file DataStore, list its segments, bucket them by
 * purpose into the three political views, and attach a bounded preview of
 * resolved rows to each. Returns lists grouped by view.
 */
export async function getPoliticalLists(
  scopeCtx?: ScopeContext,
): Promise<Record<PoliticalView, PoliticalListRow[]>> {
  const ctx = scopeCtx ?? (await getScopeContext());

  const grouped: Record<PoliticalView, PoliticalListRow[]> = {
    walk: [],
    call: [],
    fundraising: [],
  };

  // 1. Scoped voter-file stores. The backend already scopes /stores/ to the
  //    user's accessible clients; we additionally constrain to the active
  //    scope's client set (belt-and-suspenders, mirrors deliverables page).
  const stores = await apiList<DataStore>("/api/v1/datastore/stores/", {
    revalidate: 0,
  });

  const { activeClientIds } = ctx;
  const clientNameById = new Map(ctx.clients.map((c) => [c.id, c.name] as const));

  const politicalStores = stores.filter((s) => {
    if (!POLITICAL_STORE_KINDS.has(s.kind)) return false;
    if (activeClientIds === null) return true; // admin / all scope
    return activeClientIds.includes(s.client);
  });

  if (politicalStores.length === 0) return grouped;

  // 2 + 3 + 4. For each store, list segments, bucket, and resolve previews.
  await Promise.all(
    politicalStores.map(async (store) => {
      const columns = deriveColumns(store);
      const clientName = clientNameById.get(store.client);

      const segments = await apiList<Segment>(
        `/api/v1/datastore/segments/?store=${encodeURIComponent(store.id)}`,
        { revalidate: 0 },
      );

      const political = segments
        .map((seg) => ({ seg, view: purposeToView(seg.purpose) }))
        .filter((x): x is { seg: Segment; view: PoliticalView } => x.view !== null);

      await Promise.all(
        political.map(async ({ seg, view }) => {
          const resolved = await apiGet<ResolveResponse>(
            `/api/v1/datastore/segments/${encodeURIComponent(
              seg.id,
            )}/resolve/?limit=${PREVIEW_LIMIT}&offset=0`,
            { revalidate: 0 },
          );

          const records = resolved?.results ?? [];
          const count = resolved?.count ?? seg.count ?? records.length;
          const preview = recordsToRows(records, columns);

          grouped[view].push({
            id: seg.id,
            name: seg.name,
            slug: seg.slug,
            description: seg.description,
            view,
            count,
            columns,
            preview,
            hasMore: count > preview.length,
            storeName: store.name,
            storeId: store.id,
            clientName,
          });
        }),
      );
    }),
  );

  // Stable ordering: by client, then segment name.
  for (const view of POLITICAL_VIEWS) {
    grouped[view].sort(
      (a, b) =>
        (a.clientName ?? "").localeCompare(b.clientName ?? "") ||
        a.name.localeCompare(b.name),
    );
  }

  return grouped;
}

/**
 * Fetch the scoped voter-file DataStores with their row counts.
 * Used for store-level stats (total rows in the master voter file)
 * rather than summing segment counts. Keeps getPoliticalLists return shape
 * unchanged so all existing callers continue to work.
 */
export async function getPoliticalStores(
  scopeCtx?: ScopeContext,
): Promise<PoliticalStore[]> {
  const ctx = scopeCtx ?? (await getScopeContext());
  const clientNameById = new Map(ctx.clients.map((c) => [c.id, c.name] as const));

  const stores = await apiList<DataStore>("/api/v1/datastore/stores/", {
    revalidate: 0,
  });

  const { activeClientIds } = ctx;

  return stores
    .filter((s) => {
      if (!POLITICAL_STORE_KINDS.has(s.kind)) return false;
      if (activeClientIds === null) return true;
      return activeClientIds.includes(s.client);
    })
    .map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      rowCount: s.row_count ?? 0,
      clientName: clientNameById.get(s.client),
      columns: (s.columns ?? []).map((c) => ({ key: c.key, label: c.label })),
    }));
}

// ── Voter-file analytics (Shiny app port) ───────────────────────────────────

export interface VoterAnalyticsOptions {
  electionType?: "primary" | "general";
  weight?: "precinct" | "county";
  top?: number;
}

/**
 * Fetch computed voter-file analytics for a single store from the backend
 * `analytics` action (ports the legacy Grit Shiny VoterFile Analysis widgets:
 * party breakdown, voter frequency, weighted precinct/county ranking, age
 * histogram, gender, county counts).
 *
 * Returns null on any soft failure so the page can degrade gracefully.
 */
export async function getVoterAnalytics(
  storeId: string,
  opts: VoterAnalyticsOptions = {},
): Promise<VoterAnalytics | null> {
  const params = new URLSearchParams({
    election_type: opts.electionType ?? "primary",
    weight: opts.weight ?? "precinct",
    top: String(opts.top ?? 25),
  });
  return apiGet<VoterAnalytics>(
    `/api/v1/datastore/stores/${storeId}/analytics/?${params.toString()}`,
    { revalidate: 0 },
  );
}
