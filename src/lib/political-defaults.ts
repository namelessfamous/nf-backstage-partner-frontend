/**
 * Political current-filter defaults + viewer-assigned base filter resolution.
 *
 * Redirection (2026-07-15, Keys):
 *   • Default election = general, unless overridden in client political meta.
 *   • Default filter   = GeneralFrequency > 0 (general) or PrimaryFrequency > 0
 *                        (primary). Expressed here as the "1+" frequency
 *                        threshold on the election-appropriate frequency column.
 *   • The current filter leads the ENTIRE political dashboard, data scope,
 *     walk/call modules, etc. Segments are just saved filters (snapshots of a
 *     filter def + its data, static until re-materialized).
 *   • A client-viewer user can be assigned an (uneditable) DEFAULT CURRENT
 *     FILTER per accessible client. That assigned filter is a base predicate —
 *     a floor the viewer cannot move off of — and viewers may STACK additional
 *     filtering on top (drill down within their scope). It ANDs with any
 *     viewer-applied rules; it is never a hard ceiling.
 *
 * This module is client-safe (no server-only imports) so both the RSC page and
 * the client dashboard can share the same resolution logic.
 */

import type { Client } from "@/types/api";

export type ElectionType = "primary" | "general";

/**
 * Backend filter grammar (matches FilterDef in voter-list-view / political.ts):
 *   { op: "and" | "or", rules: [ { key, cmp, value } | FilterDef ] }
 */
export interface AssignedFilterDef {
  op: "and" | "or";
  rules: Array<
    { key: string; cmp: string; value: unknown } | AssignedFilterDef
  >;
}

/** The system default election when nothing overrides it. */
export const DEFAULT_ELECTION: ElectionType = "general";

/** The system default frequency floor: 1+ (voted in >0 of last 4 cycles). */
export const DEFAULT_FREQ_FLOOR = "1" as const;

// ── Client political-meta reading ────────────────────────────────────────────

/**
 * Read a client's default election from its political meta, falling back to the
 * system default (general). Accepts a handful of meta shapes so the backstage
 * side can store it wherever is convenient without a frontend change:
 *
 *   client.meta.default_election            = "primary" | "general"
 *   client.meta.political.default_election   = "primary" | "general"
 *   client.brand_info.default_election       = "primary" | "general"
 */
export function clientDefaultElection(
  client: Client | null | undefined,
): ElectionType {
  if (!client) return DEFAULT_ELECTION;

  const candidates: unknown[] = [
    client.meta?.default_election,
    (client.meta?.political as Record<string, unknown> | undefined)
      ?.default_election,
    client.brand_info?.default_election,
  ];

  for (const c of candidates) {
    if (typeof c === "string") {
      const v = c.trim().toLowerCase();
      if (v === "primary" || v === "general") return v;
    }
  }
  return DEFAULT_ELECTION;
}

/**
 * Resolve the viewer-assigned DEFAULT CURRENT FILTER for a client, if any.
 *
 * This is the (uneditable) base predicate a client-viewer is pinned to for a
 * given client. It is read from the client record's meta so it can be plumbed
 * through the existing /api/v1/clients/ payload without a new endpoint. The
 * backend may set it per-user (ClientUser.meta.default_filter) and surface the
 * resolved-for-this-user value onto the client meta the frontend already
 * receives; the frontend only needs the resolved filter def.
 *
 * Accepted shapes (first non-empty wins):
 *   client.meta.viewer_default_filter        = FilterDef
 *   client.meta.default_current_filter       = FilterDef
 *   client.meta.political.default_filter     = FilterDef
 *
 * Returns null when there is no assigned filter (the common case). A null
 * assigned filter means the viewer starts from the system defaults and can
 * filter freely.
 */
export function clientAssignedFilter(
  client: Client | null | undefined,
): AssignedFilterDef | null {
  if (!client) return null;

  const candidates: unknown[] = [
    client.meta?.viewer_default_filter,
    client.meta?.default_current_filter,
    (client.meta?.political as Record<string, unknown> | undefined)
      ?.default_filter,
  ];

  for (const c of candidates) {
    const norm = normalizeFilterDef(c);
    if (norm) return norm;
  }
  return null;
}

/**
 * Validate/normalize an unknown value into an AssignedFilterDef, or null.
 * Guards against malformed meta so a bad backend value can never crash the
 * dashboard — it just degrades to "no assigned filter".
 */
export function normalizeFilterDef(raw: unknown): AssignedFilterDef | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const op = obj.op === "or" ? "or" : obj.op === "and" ? "and" : null;
  if (!op) return null;
  if (!Array.isArray(obj.rules) || obj.rules.length === 0) return null;
  // Shallow-validate rule shapes; nested FilterDefs are allowed.
  const rules = obj.rules.filter((r) => {
    if (!r || typeof r !== "object") return false;
    if ("op" in (r as object)) return normalizeFilterDef(r) !== null;
    const rr = r as Record<string, unknown>;
    return typeof rr.key === "string" && typeof rr.cmp === "string";
  });
  if (rules.length === 0) return null;
  return { op, rules: rules as AssignedFilterDef["rules"] };
}
