import { apiList } from "@/lib/api";
import { getScopeContext, type ScopeContext } from "@/lib/scope";
import type { BackstageDeliverable, DeliverableFile, Client } from "@/types/api";
import {
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
  type PoliticalView,
  type PoliticalColumn,
  type PoliticalFileRow,
} from "@/lib/political-types";

export {
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
  type PoliticalView,
  type PoliticalColumn,
  type PoliticalFileRow,
};

/**
 * Political dashboard data layer.
 *
 * The Political tab surfaces *files* (not deliverables) that belong to a
 * political field program, grouped into three views:
 *   - walk        → door-knocking / canvass walk lists
 *   - call        → phone-bank call lists
 *   - fundraising → donor / fundraising lists
 *
 * Files live inside deliverables (`deliverable.file_details[]`) and are tagged
 * for a view via their free-form `meta` object:
 *
 *   file.meta.view_template = "walk" | "call" | "fundraising"
 *
 * Optional column control (per file) — defines the CSV columns to render.
 * Falls back to every scalar meta key (minus the control keys) when absent:
 *
 *   file.meta.columns = [{ key: "street", label: "Street" }, ...]
 *
 * All other scalar meta entries are treated as data cells. This keeps the
 * contract self-documenting and additive: the backend can attach whatever
 * columns a given program needs without a frontend change.
 */

/** Reserved meta keys that are NOT rendered as data columns. */
const CONTROL_KEYS = new Set([
  "view_template",
  "columns",
  "allow_download",
]);

// ---------------------------------------------------------------------------
// Niche gating — only surface Political for political/public-affairs clients
// ---------------------------------------------------------------------------

/**
 * Substrings (lowercased) that mark a client as political / public-affairs.
 * Matched against the client's niche/industry hints in meta + brand_info.
 */
const POLITICAL_NICHE_MATCHERS = [
  "political",
  "public affairs",
  "public-affairs",
  "public_affairs",
  "publicaffairs",
];

/** Meta keys that may carry the niche/industry label. */
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
 *
 *   client scope  → that one client's niche
 *   partner scope → any client belonging to the partner
 *   all scope     → any accessible client (admin/global view)
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

function scalarToString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null; // skip objects/arrays — not scalar cell data
}

function normalizeView(raw: unknown): PoliticalView | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return (POLITICAL_VIEWS as string[]).includes(v) ? (v as PoliticalView) : null;
}

function deriveColumns(meta: Record<string, unknown>): PoliticalColumn[] {
  // Explicit column declaration wins.
  const declared = meta.columns;
  if (Array.isArray(declared)) {
    const cols = declared
      .map((c) => {
        if (c && typeof c === "object" && "key" in c) {
          const key = String((c as Record<string, unknown>).key);
          const label =
            "label" in c
              ? String((c as Record<string, unknown>).label)
              : key;
          return { key, label };
        }
        if (typeof c === "string") return { key: c, label: c };
        return null;
      })
      .filter((c): c is PoliticalColumn => Boolean(c && c.key));
    if (cols.length) return cols;
  }

  // Fall back: every scalar meta key that isn't a control key.
  return Object.keys(meta)
    .filter((k) => !CONTROL_KEYS.has(k) && scalarToString(meta[k]) !== null)
    .map((k) => ({
      key: k,
      label: k
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase()),
    }));
}

function fileToRow(
  file: DeliverableFile,
  view: PoliticalView,
  ctx: { deliverableName: string; projectName?: string; clientName?: string },
): PoliticalFileRow {
  const meta = (file.meta ?? {}) as Record<string, unknown>;
  const columns = deriveColumns(meta);

  const cells: Record<string, string> = {};
  for (const col of columns) {
    cells[col.key] = scalarToString(meta[col.key]) ?? "";
  }

  return {
    id: file.id,
    name: file.name,
    url: file.url,
    mime_type: file.mime_type,
    size: file.size,
    view,
    allowDownload: meta.allow_download !== false,
    deliverableName: ctx.deliverableName,
    projectName: ctx.projectName,
    clientName: ctx.clientName,
    columns,
    cells,
    file,
  };
}

/**
 * Fetch every scoped deliverable, flatten its files, and keep only those
 * tagged with a political view. Returns rows grouped by view.
 */
export async function getPoliticalRows(
  scopeCtx?: ScopeContext,
): Promise<Record<PoliticalView, PoliticalFileRow[]>> {
  const ctx = scopeCtx ?? (await getScopeContext());

  let path = "/api/v1/deliverables/";
  if (ctx.active.type === "partner") {
    path += `?partner=${encodeURIComponent(ctx.active.slug)}`;
  } else if (ctx.active.type === "client") {
    path += `?client=${encodeURIComponent(ctx.active.slug)}`;
  }

  const deliverables = await apiList<BackstageDeliverable>(path, { revalidate: 0 });

  // Belt-and-suspenders scope filter (mirrors deliverables page).
  const { activeClientIds } = ctx;
  const scoped =
    activeClientIds === null
      ? deliverables
      : deliverables.filter(
          (d) => d.client_id != null && activeClientIds.includes(d.client_id),
        );

  const grouped: Record<PoliticalView, PoliticalFileRow[]> = {
    walk: [],
    call: [],
    fundraising: [],
  };

  for (const d of scoped) {
    for (const file of d.file_details ?? []) {
      const view = normalizeView((file.meta ?? {}).view_template);
      if (!view) continue;
      grouped[view].push(
        fileToRow(file, view, {
          deliverableName: d.name,
          projectName: d.project_name,
          clientName: d.client_name,
        }),
      );
    }
  }

  return grouped;
}
