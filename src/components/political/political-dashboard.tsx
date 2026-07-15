"use client";

/**
 * PoliticalDashboard — client orchestration layer for the political overview.
 *
 * Owns `currentFilter` state (geo + election + applied segment) and keeps the
 * stats row, analytics widgets, and VoterListView all in sync. The parent RSC
 * (page.tsx) gathers initial server data and passes it in as props.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Flag,
  Landmark,
  Vote,
  MapPin,
  Filter,
  Bookmark,
  Download,
  Footprints,
  Phone,
  HandCoins,
  Mail,
  BarChart3,
  PieChart,
  ChevronDown,
  Shield,
  Tag,
  Building2,
  ArrowRight,
  ListFilter,
  Activity,
} from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import {
  HBars,
  WidgetCard,
  partyColor,
} from "@/components/political/analytics-widgets";
import {
  VoterListView,
  type FilterDef,
} from "@/components/political/voter-list-view";
import type {
  PoliticalStore,
  PoliticalListRow,
  VoterAnalytics,
  VoterAnalyticsBar,
} from "@/lib/political-types";
import {
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
} from "@/lib/political-types";
import type { FilterableSegment } from "@/components/political/segment-filter-dropdown";
import { SegmentFilterDropdown } from "@/components/political/segment-filter-dropdown";
import {
  DEFAULT_FREQ_FLOOR,
  type AssignedFilterDef,
} from "@/lib/political-defaults";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GeoType = "county" | "ld" | "sd";
type ElectionType = "primary" | "general";
/**
 * Voter-frequency threshold: minimum number of the last 4 cycles voted.
 * "" = no threshold (All). "1" = 1+ (>0), "2" = 2+, "3" = 3+, "4" = 4/4.
 * Backend stores PrimaryFrequency/GeneralFrequency as string digits '0'..'5';
 * a JSONB gte on single-digit strings is order-equivalent to numeric gte.
 */
type FreqThreshold = "" | "1" | "2" | "3" | "4";

const FREQ_THRESHOLD_OPTIONS: { value: FreqThreshold; label: string }[] = [
  { value: "", label: "All" },
  { value: "1", label: "1+ (\u003e0)" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4/4" },
];

interface AppliedSegment {
  id: string;
  name: string;
  filter: FilterDef;
}

interface CurrentFilter {
  geoType: GeoType;
  geoValue: string;
  election: ElectionType;
  /** Minimum primary-election frequency (of last 4 cycles). "" = no filter. */
  primaryFreq: FreqThreshold;
  /** Minimum general-election frequency (of last 4 cycles). "" = no filter. */
  generalFreq: FreqThreshold;
  segment?: AppliedSegment | null;
}

/**
 * Seed the default frequency floor onto the election-appropriate frequency
 * column (redirection: default filter = GeneralFrequency > 0, or
 * PrimaryFrequency > 0 when the election context is primary). "1" = 1+ (>0).
 */
function defaultFreqForElection(election: ElectionType): {
  primaryFreq: FreqThreshold;
  generalFreq: FreqThreshold;
} {
  return election === "primary"
    ? { primaryFreq: DEFAULT_FREQ_FLOOR, generalFreq: "" }
    : { primaryFreq: "", generalFreq: DEFAULT_FREQ_FLOOR };
}

const VIEW_HREFS: Record<string, string> = {
  walk: "/dashboard/political/walk",
  call: "/dashboard/political/call",
  fundraising: "/dashboard/political/fundraising",
  mail: "/dashboard/political/mail",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the effective backend filter_def from the current filter state.
 *
 * Layering (redirection 2026-07-15): the viewer-assigned base filter is an
 * uneditable FLOOR that always ANDs in first, then the viewer's stacked rules
 * (geo + frequency + applied segment) AND on top to drill down within scope.
 * The assigned filter is a base predicate, never a hard ceiling. Returns null
 * only when there are no rules at all (pass nothing to backend = whole file).
 */
function buildEffectiveFilter(
  cf: CurrentFilter,
  assigned?: AssignedFilterDef | null,
): FilterDef | null {
  const rules: FilterDef["rules"] = [];

  // Assigned base filter (uneditable floor) ANDs in first.
  if (assigned) {
    rules.push(assigned as unknown as FilterDef);
  }

  if (cf.geoType === "county" && cf.geoValue) {
    rules.push({ key: "CountyName", cmp: "eq", value: cf.geoValue });
  }

  // Frequency thresholds → gte on the backend string-digit frequency columns.
  if (cf.primaryFreq) {
    rules.push({ key: "PrimaryFrequency", cmp: "gte", value: cf.primaryFreq });
  }
  if (cf.generalFreq) {
    rules.push({ key: "GeneralFrequency", cmp: "gte", value: cf.generalFreq });
  }

  if (cf.segment?.filter) {
    // Merge segment filter rules directly (they're already a valid filter_def)
    rules.push(cf.segment.filter);
  }

  if (rules.length === 0) return null;
  return { op: "and", rules };
}

// ---------------------------------------------------------------------------
// PoliticalDashboard
// ---------------------------------------------------------------------------

export interface PoliticalDashboardProps {
  /** The active voter-file store. */
  activeStore: PoliticalStore | null;
  /** All voter-file stores available in this scope. */
  voterFiles: PoliticalStore[];
  /** Pre-computed analytics from the server (whole-file, initial render). */
  initialAnalytics: VoterAnalytics | null;
  /** County options derived from initialAnalytics.county_counts. */
  countyOptions: string[];
  /** Segments for the active store, grouped by view. */
  groupedLists: Record<string, PoliticalListRow[]>;
  /** Segments flat list for the active store. */
  storeSegments: FilterableSegment[];
  /** Client subtitle (partner/client name). */
  clientSubtitle: string | null;
  /** Whether the logged-in user is admin (can create segments). */
  isAdmin: boolean;
  /** Initial geo type from URL search params. */
  initialGeoType: GeoType;
  /** Initial geo value from URL search params. */
  initialGeoValue: string;
  /** Initial election type from URL search params. */
  initialElection: ElectionType;
  /**
   * Viewer-assigned DEFAULT CURRENT FILTER for this client (uneditable floor).
   * Null when the viewer has no assigned base filter. ANDs into every effective
   * filter; viewers stack additional filtering on top to drill down within it.
   */
  assignedFilter?: AssignedFilterDef | null;
  /**
   * The default effective filter the server used to pre-compute
   * initialAnalytics (freq floor + assigned base). Passed for parity so the
   * client's seeded effective filter matches the SSR data on first paint.
   */
  initialEffectiveFilter?: AssignedFilterDef | null;
  /** Store id to use for store-switching links. */
  activeStoreId: string | null;
}

export function PoliticalDashboard({
  activeStore,
  voterFiles,
  initialAnalytics,
  countyOptions,
  groupedLists,
  storeSegments,
  clientSubtitle,
  isAdmin,
  initialGeoType,
  initialGeoValue,
  initialElection,
  assignedFilter = null,
  initialEffectiveFilter = null,
  activeStoreId,
}: PoliticalDashboardProps) {
  // initialEffectiveFilter is the SSR-applied default filter; the client seeds
  // the same predicate via defaultFreqForElection + assignedFilter below, so
  // first-paint analytics (SSR) and the client effective filter agree.
  void initialEffectiveFilter;
  const router = useRouter();

  // ── Filter state ──────────────────────────────────────────────────────────
  // Seed the default frequency floor onto the election-appropriate column
  // (default filter = General/PrimaryFrequency > 0 per the current election).
  const [currentFilter, setCurrentFilter] = useState<CurrentFilter>(() => ({
    geoType: initialGeoType,
    geoValue: initialGeoValue,
    election: initialElection,
    ...defaultFreqForElection(initialElection),
    segment: null,
  }));

  // ── Analytics state (client-side, filter-aware) ───────────────────────────
  const [analytics, setAnalytics] = useState<VoterAnalytics | null>(
    initialAnalytics,
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const fetchControllerRef = useRef<AbortController | null>(null);

  // ── Derived effective filter_def ──────────────────────────────────────────
  const effectiveFilter = buildEffectiveFilter(currentFilter, assignedFilter);

  // Fetch analytics whenever filter or election changes
  const fetchAnalytics = useCallback(
    async (cf: CurrentFilter, storeId: string) => {
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      const ctrl = new AbortController();
      fetchControllerRef.current = ctrl;

      setAnalyticsLoading(true);
      try {
        const eff = buildEffectiveFilter(cf, assignedFilter);
        const params = new URLSearchParams({
          election_type: cf.election,
          weight: "county",
          top: "25",
        });
        if (eff) {
          params.set("filter", JSON.stringify(eff));
        }
        const res = await fetch(
          `/api/political/stores/${encodeURIComponent(storeId)}/analytics?${params.toString()}`,
          { cache: "no-store", signal: ctrl.signal },
        );
        if (!res.ok) throw new Error(`Analytics fetch failed (${res.status})`);
        const data: VoterAnalytics = await res.json();
        setAnalytics(data);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          // On error keep existing analytics data rather than showing nothing
          console.error("Analytics fetch error:", e);
        }
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [],
  );

  // Re-fetch analytics on filter change (skip on first mount — we have SSR data)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (activeStore) {
      fetchAnalytics(currentFilter, activeStore.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentFilter.geoType,
    currentFilter.geoValue,
    currentFilter.election,
    currentFilter.primaryFreq,
    currentFilter.generalFreq,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(currentFilter.segment),
    activeStore?.id,
  ]);

  // ── Party KPIs (from live analytics) ─────────────────────────────────────
  const totalOfficial =
    analytics?.official_party.reduce((s, d) => s + d.value, 0) ?? 0;
  const repCount =
    analytics?.official_party.find((d) =>
      d.label.toLowerCase().startsWith("rep"),
    )?.value ?? 0;
  const demCount =
    analytics?.official_party.find((d) =>
      d.label.toLowerCase().startsWith("dem"),
    )?.value ?? 0;
  const otherCount = totalOfficial - repCount - demCount;
  const repShare = totalOfficial ? (repCount / totalOfficial) * 100 : 0;
  const demShare = totalOfficial ? (demCount / totalOfficial) * 100 : 0;
  const otherShare = totalOfficial ? (otherCount / totalOfficial) * 100 : 0;

  // Total voters: use analyzed_rows from the filtered analytics response
  const totalVoters = analytics?.analyzed_rows ?? activeStore?.rowCount ?? 0;

  // ── Segment apply ─────────────────────────────────────────────────────────
  // Applies a saved segment's filter to the dashboard IN PLACE (drives both
  // stats and the voter list via the effective filter) instead of navigating
  // to the segment detail page. Passing null (or a segment with no criteria)
  // clears the applied segment.
  function applySegment(
    seg: (FilterableSegment & { filter?: FilterDef }) | null,
  ) {
    if (!seg || !seg.filter) {
      setCurrentFilter((prev) => ({ ...prev, segment: null }));
      return;
    }
    setCurrentFilter((prev) => ({
      ...prev,
      segment: { id: seg.id, name: seg.name, filter: seg.filter! },
    }));
  }

  // ── Row filter action for analytics widget rows ───────────────────────────
  const rowFilter = (colLabel: string) => (bar: VoterAnalyticsBar) => (
    <SegmentFilterDropdown
      col={bar.filter_col}
      val={bar.filter_val}
      label={colLabel}
      segments={storeSegments}
      align="right"
    />
  );

  // ── Store switching params ────────────────────────────────────────────────
  const baseParams: Record<string, string> = {
    ...(activeStoreId ? { store: activeStoreId } : {}),
    election: currentFilter.election,
    geoType: currentFilter.geoType,
    ...(currentFilter.geoValue ? { geoValue: currentFilter.geoValue } : {}),
  };

  // ── "Save as Segment" ─────────────────────────────────────────────────────
  const [savingSegment, setSavingSegment] = useState(false);

  async function handleSaveSegment() {
    if (!activeStore || !effectiveFilter) return;
    const defaultName = `${currentFilter.geoValue || currentFilter.segment?.name || "Filtered"} — ${new Date().toLocaleDateString()}`;
    const name = window.prompt("Segment name:", defaultName);
    if (!name) return;

    setSavingSegment(true);
    try {
      const res = await fetch("/api/political/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store: activeStore.id,
          name: name.trim(),
          purpose: "generic",
          filter: effectiveFilter,
        }),
      });
      if (res.ok) {
        alert(`Segment "${name}" saved. The page will refresh to show it.`);
        window.location.reload();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save segment: ${JSON.stringify(err)}`);
      }
    } catch (e) {
      alert(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingSegment(false);
    }
  }

  // ── Columns for voter list ────────────────────────────────────────────────
  const voterColumns = (activeStore?.columns ?? [])
    .filter((c) => c.key)
    .map((c) => ({ key: c.key, label: c.label ?? c.key }));

  // ── Segment rows flattened for segment list ───────────────────────────────
  const segmentsByView = POLITICAL_VIEWS.map((view) => ({
    view,
    segs: (groupedLists[view] ?? []).filter((s) => s.storeId === activeStore?.id),
  })).filter((g) => g.segs.length > 0);

  return (
    <div className="space-y-8">
      {/* ── 1. TITLE BLOCK ─────────────────────────────────────────────────────────── */}
      <div>
        <p className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--brand-muted)]">
          <Landmark className="h-3 w-3" aria-hidden="true" />
          Political
        </p>
        <h1 className="mt-0.5 text-3xl font-semibold text-[var(--brand-foreground)] sm:text-4xl">
          Dashboard
        </h1>
        {clientSubtitle && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)]">
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            Client — {clientSubtitle}
          </p>
        )}
      </div>

      {/* ── 2. LIST BUILDING nav cards (moved to top) ──────────────────── */}
      <div>
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          <Users className="h-4 w-4" aria-hidden="true" />
          List Building
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {POLITICAL_VIEWS.map((view) => {
            const meta = POLITICAL_VIEW_META[view];
            const lists = groupedLists[view] ?? [];
            return (
              <Link
                key={view}
                href={VIEW_HREFS[view]}
                className="group block rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-5 transition hover:bg-[var(--brand-surface-strong)]/70 hover:shadow-sm"
              >
                {/* View icon */}
                {view === "walk" && <Footprints className="mb-3 h-6 w-6 text-[var(--brand-muted)] transition group-hover:text-[var(--brand-primary)]" aria-hidden="true" />}
                {view === "call" && <Phone className="mb-3 h-6 w-6 text-[var(--brand-muted)] transition group-hover:text-[var(--brand-primary)]" aria-hidden="true" />}
                {view === "fundraising" && <HandCoins className="mb-3 h-6 w-6 text-[var(--brand-muted)] transition group-hover:text-[var(--brand-primary)]" aria-hidden="true" />}
                <p className="text-base font-semibold text-[var(--brand-foreground)] group-hover:text-[var(--brand-primary)]">
                  {meta.label}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">
                  {meta.blurb}
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-2xl font-bold tabular-nums text-[var(--brand-foreground)]">
                    {lists.length}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-[var(--brand-muted)]">
                    {lists.length === 1 ? "list" : "lists"}
                    <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 3. CAMPAIGN OPERATIONS (moved to top) ──────────────────────── */}
      <div>
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          <Activity className="h-4 w-4" aria-hidden="true" />
          Campaign Operations
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href={VIEW_HREFS.mail}
            className="group block rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-5 transition hover:bg-[var(--brand-surface-strong)]/70 hover:shadow-sm"
          >
            <Mail className="mb-3 h-6 w-6 text-[var(--brand-muted)] transition group-hover:text-[var(--brand-primary)]" aria-hidden="true" />
            <p className="text-base font-semibold text-[var(--brand-foreground)] group-hover:text-[var(--brand-primary)]">
              Direct Mail
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">
              Plan and track campaign mail pieces — universe, units, costs,
              print status, and drop dates grouped by election cycle.
            </p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-2xl font-bold tabular-nums text-[var(--brand-foreground)]">
                →
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--brand-muted)]">
                mail grid
                <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4. FILTERS BAR ─────────────────────────────────────────────── */}
      {voterFiles.length > 0 && (
        <div className="rounded-3xl bg-[var(--brand-surface-strong)]/40 border border-black/5 p-4">
          {assignedFilter && (
            <div className="mb-3 flex items-center gap-1.5 text-[0.65rem] font-medium text-[var(--brand-muted)]">
              <Shield className="h-3 w-3 text-[var(--brand-primary)]" aria-hidden="true" />
              <span>
                Assigned scope active — your view is scoped to an assigned base
                filter. You can narrow further below, but not beyond it.
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-4">
            {/* Voter file picker (only when multiple files) */}
            {voterFiles.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                  <Users className="h-3 w-3" aria-hidden="true" />
                  Voter File
                </span>
                <FilterSelect<string>
                  value={activeStore?.id ?? ""}
                  minWidth="14rem"
                  options={voterFiles.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.rowCount.toLocaleString()})`,
                  }))}
                  onSelect={(id) => {
                    const params = new URLSearchParams({
                      ...baseParams,
                      store: id,
                    });
                    router.push(`?${params.toString()}`, { scroll: false });
                  }}
                />
              </div>
            )}

            {/* Saved segments dropdown */}
            {segmentsByView.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                  <Bookmark className="h-3 w-3" aria-hidden="true" />
                  Segments
                </span>
                <details className="group relative inline-block">
                  <summary className="inline-flex min-w-[7.5rem] cursor-pointer list-none items-center justify-between gap-2 rounded-full bg-[var(--brand-surface-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--brand-foreground)] transition hover:text-[var(--brand-primary)] [&::-webkit-details-marker]:hidden">
                    <span className="truncate">
                      {currentFilter.segment
                        ? currentFilter.segment.name
                        : `Saved Segments (${storeSegments.length})`}
                    </span>
                    <ChevronDown className="h-3 w-3 shrink-0 text-[var(--brand-muted)] transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="absolute z-30 mt-1 min-w-[13rem] rounded-2xl border border-black/10 bg-[var(--brand-surface)] p-1.5 shadow-lg">
                    {currentFilter.segment && (
                      <button
                        type="button"
                        onClick={() => applySegment(null)}
                        className="mb-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-[var(--brand-muted)] transition hover:bg-[var(--brand-primary)]/10"
                      >
                        ✕ Clear applied segment
                      </button>
                    )}
                    {segmentsByView.map(({ view, segs }) => (
                      <div key={view} className="py-0.5">
                        <p className="px-2 pb-0.5 pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--brand-muted)]/70">
                          {POLITICAL_VIEW_META[view].label}
                        </p>
                        {segs.map((seg) => {
                          const applied = currentFilter.segment?.id === seg.id;
                          const hasFilter =
                            !!seg.filter &&
                            typeof seg.filter === "object" &&
                            Array.isArray(
                              (seg.filter as { rules?: unknown[] }).rules,
                            ) &&
                            ((seg.filter as { rules: unknown[] }).rules.length >
                              0);
                          return (
                            <button
                              key={seg.id}
                              type="button"
                              onClick={() =>
                                applySegment({
                                  id: seg.id,
                                  name: seg.name,
                                  view: seg.view,
                                  filter: hasFilter
                                    ? (seg.filter as FilterDef)
                                    : undefined,
                                })
                              }
                              title={
                                hasFilter
                                  ? "Apply this segment's filter to the dashboard"
                                  : "This segment has no stored filter criteria"
                              }
                              className={
                                "block w-full rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-[var(--brand-primary)]/10 " +
                                (applied
                                  ? "font-semibold text-[var(--brand-primary)]"
                                  : "text-[var(--brand-foreground)]")
                              }
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {applied && <span>✓</span>}
                                {seg.name}
                                {!hasFilter && (
                                  <span className="text-[0.6rem] text-[var(--brand-muted)]/60">
                                    (no criteria)
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Geography filter */}
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                <MapPin className="h-3 w-3" aria-hidden="true" />
                Geography
              </span>
              <div className="flex items-center gap-2">
                {/* GeoType dropdown */}
                <FilterSelect<GeoType>
                  value={currentFilter.geoType}
                  options={[
                    { value: "county", label: "County" },
                    {
                      value: "ld",
                      label: "Legislative District",
                      disabled: true,
                      disabledHint:
                        "Coming soon — backend has no LD column mapping yet",
                    },
                    {
                      value: "sd",
                      label: "Senate District",
                      disabled: true,
                      disabledHint:
                        "Coming soon — backend has no SD column mapping yet",
                    },
                  ]}
                  onSelect={(val) =>
                    setCurrentFilter((prev) => ({
                      ...prev,
                      geoType: val,
                      geoValue: "",
                    }))
                  }
                />

                {/* County value dropdown */}
                {currentFilter.geoType === "county" && countyOptions.length > 0 && (
                  <GeoValueSelect
                    options={countyOptions}
                    current={currentFilter.geoValue}
                    onSelect={(val) =>
                      setCurrentFilter((prev) => ({ ...prev, geoValue: val }))
                    }
                  />
                )}
              </div>
            </div>

            {/* Election-type toggle (drives which frequency the widget displays) */}
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                <Vote className="h-3 w-3" aria-hidden="true" />
                Election
              </span>
              <FilterSelect<ElectionType>
                value={currentFilter.election}
                options={[
                  { value: "primary", label: "Primary" },
                  { value: "general", label: "General" },
                ]}
                onSelect={(val) =>
                  setCurrentFilter((prev) => {
                    // Re-seed the default frequency floor onto the newly
                    // selected election's column ONLY when the user hasn't
                    // moved off the default on either column. Preserve any
                    // manual threshold the viewer has set.
                    const onDefaults =
                      (prev.election === "general" &&
                        prev.generalFreq === DEFAULT_FREQ_FLOOR &&
                        prev.primaryFreq === "") ||
                      (prev.election === "primary" &&
                        prev.primaryFreq === DEFAULT_FREQ_FLOOR &&
                        prev.generalFreq === "");
                    return {
                      ...prev,
                      election: val,
                      ...(onDefaults ? defaultFreqForElection(val) : {}),
                    };
                  })
                }
              />
            </div>

            {/* Primary Frequency threshold filter */}
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                <BarChart3 className="h-3 w-3" aria-hidden="true" />
                Primary Frequency
              </span>
              <FilterSelect<FreqThreshold>
                value={currentFilter.primaryFreq}
                options={FREQ_THRESHOLD_OPTIONS}
                onSelect={(val) =>
                  setCurrentFilter((prev) => ({ ...prev, primaryFreq: val }))
                }
              />
            </div>

            {/* General Frequency threshold filter */}
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                <BarChart3 className="h-3 w-3" aria-hidden="true" />
                General Frequency
              </span>
              <FilterSelect<FreqThreshold>
                value={currentFilter.generalFreq}
                options={FREQ_THRESHOLD_OPTIONS}
                onSelect={(val) =>
                  setCurrentFilter((prev) => ({ ...prev, generalFreq: val }))
                }
              />
            </div>

            {/* Save as Segment (admin only, only when there is an active filter) */}
            {isAdmin && effectiveFilter && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                  &nbsp;
                </span>
                <button
                  type="button"
                  disabled={savingSegment}
                  onClick={handleSaveSegment}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5 px-3.5 py-1.5 text-xs font-medium text-[var(--brand-primary)] transition hover:bg-[var(--brand-primary)]/10 disabled:opacity-50"
                >
                  <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                  {savingSegment ? "Saving…" : "Save as Segment"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 5. STATS ROW ───────────────────────────────────────────────── */}
      <div>
        <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4 transition-opacity duration-200 ${analyticsLoading ? "opacity-60" : ""}`}>
          {/* Total Count — reflects effective filter via filtered analytics */}
          <StatsCard
            label="Total Voters"
            icon={Users}
            value={totalVoters.toLocaleString()}
            sub={
              currentFilter.geoValue && currentFilter.geoType === "county"
                ? `${currentFilter.geoValue} County`
                : currentFilter.segment
                ? currentFilter.segment.name
                : activeStore?.name ?? `${voterFiles.length} voter files`
            }
          />

          {/* Republican */}
          <StatsCard
            label="Republican"
            icon={Flag}
            value={totalOfficial ? `${repShare.toFixed(1)}%` : "—"}
            sub={
              totalOfficial
                ? `${repCount.toLocaleString()} voters`
                : undefined
            }
          />

          {/* Democrat */}
          <StatsCard
            label="Democrat"
            icon={Shield}
            value={totalOfficial ? `${demShare.toFixed(1)}%` : "—"}
            sub={
              totalOfficial
                ? `${demCount.toLocaleString()} voters`
                : undefined
            }
          />

          {/* Other */}
          <StatsCard
            label="Other / Unaffiliated"
            icon={Tag}
            value={totalOfficial ? `${otherShare.toFixed(1)}%` : "—"}
            sub={
              totalOfficial
                ? `${otherCount.toLocaleString()} voters`
                : undefined
            }
          />
        </div>
      </div>

      {/* ── 6. ANALYTICS WIDGETS ───────────────────────────────────────── */}
      {activeStore && analytics ? (
        <div className={`space-y-4 transition-opacity duration-200 ${analyticsLoading ? "opacity-60" : ""}`}>
          <div className="grid gap-4 md:grid-cols-3">
            <WidgetCard
              title="Official Party"
              subtitle="Registered party of record"
              icon={PieChart}
            >
              <HBars
                data={analytics.official_party}
                colorFn={partyColor}
                renderRowAction={rowFilter("Party")}
              />
            </WidgetCard>

            <WidgetCard
              title="Voter Frequency"
              subtitle={`${currentFilter.election === "primary" ? "Primary" : "General"} elections voted (of last 4 cycles)`}
              icon={BarChart3}
            >
              <HBars
                data={analytics.frequency}
                colorFn={() => "var(--brand-primary)"}
                renderRowAction={rowFilter(
                  currentFilter.election === "primary"
                    ? "Primary Frequency"
                    : "General Frequency",
                )}
              />
            </WidgetCard>

            {/* By Tags — coming soon */}
            <WidgetCard
              title="By Tags"
              subtitle="DataStore record tags — coming soon"
              icon={Tag}
            >
              <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
                <span className="text-2xl">🏷️</span>
                <p className="text-center text-xs text-[var(--brand-muted)]">
                  Tag-based aggregation requires a backend{" "}
                  <code className="rounded bg-[var(--brand-surface-strong)] px-1 py-0.5 text-[0.65rem]">
                    DataStoreRecordTag
                  </code>{" "}
                  aggregation endpoint.
                </p>
                <p className="text-center text-[0.65rem] text-[var(--brand-muted)]/60">
                  Coming soon — no tag-aggregation API yet
                </p>
              </div>
            </WidgetCard>
          </div>
        </div>
      ) : voterFiles.length === 0 ? (
        <div className="rounded-3xl bg-[var(--brand-surface-strong)]/40 p-8 text-center">
          <p className="text-sm text-[var(--brand-muted)]">
            No master voter file is assigned to this scope yet. Once a voter file
            is ingested, party, turnout, and demographic analytics appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-[var(--brand-surface-strong)]/40 p-8 text-center">
          <p className="text-sm text-[var(--brand-muted)]">
            Analytics are being computed for this voter file. Refresh in a
            moment.
          </p>
        </div>
      )}

      {/* ── 7. VOTER LIST ──────────────────────────────────────────────── */}
      {activeStore ? (
        <section>
          <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            <Users className="h-4 w-4" aria-hidden="true" />
            Voter File
            {currentFilter.geoValue && currentFilter.geoType === "county"
              ? ` — ${currentFilter.geoValue} County`
              : ""}
          </h2>
          <div className="rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/30 p-4 sm:p-5">
            {voterColumns.length > 0 ? (
              <VoterListView
                storeId={activeStore.id}
                storeName={activeStore.name}
                columns={voterColumns}
                initialCount={activeStore.rowCount}
                filterDef={effectiveFilter}
              />
            ) : (
              <p className="py-6 text-center text-sm text-[var(--brand-muted)]">
                This voter file has no column schema defined yet.
              </p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GeoValueSelect — client-side county picker
// ---------------------------------------------------------------------------

function GeoValueSelect({
  options,
  current,
  onSelect,
}: {
  options: string[];
  current: string;
  onSelect: (val: string) => void;
}) {
  const label = current || "All counties";
  return (
    <details className="group relative inline-block">
      <summary className="inline-flex min-w-[7.5rem] cursor-pointer list-none items-center justify-between gap-2 rounded-full bg-[var(--brand-surface-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--brand-foreground)] transition hover:text-[var(--brand-primary)] [&::-webkit-details-marker]:hidden">
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-[var(--brand-muted)] transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="absolute z-30 mt-1 max-h-60 min-w-[11rem] overflow-y-auto rounded-2xl border border-black/10 bg-[var(--brand-surface)] p-1.5 shadow-lg">
        {/* Clear filter */}
        {current && (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-[var(--brand-muted)] transition hover:bg-[var(--brand-primary)]/10"
          >
            All counties
          </button>
        )}
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-[var(--brand-primary)]/10 ${
              opt === current
                ? "font-semibold text-[var(--brand-primary)]"
                : "text-[var(--brand-foreground)]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// FilterSelect — generic single-select dropdown filter (native <details>)
// ---------------------------------------------------------------------------

export interface FilterSelectOption<T extends string> {
  value: T;
  label: string;
  /** Disabled options render greyed out with a tooltip and are not selectable. */
  disabled?: boolean;
  disabledHint?: string;
}

function FilterSelect<T extends string>({
  value,
  options,
  onSelect,
  minWidth = "9rem",
}: {
  value: T;
  options: FilterSelectOption<T>[];
  onSelect: (val: T) => void;
  minWidth?: string;
}) {
  const current = options.find((o) => o.value === value);
  const label = current?.label ?? String(value);
  return (
    <details className="group relative inline-block">
      <summary className="inline-flex min-w-[7.5rem] cursor-pointer list-none items-center justify-between gap-2 rounded-full bg-[var(--brand-surface-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--brand-foreground)] transition hover:text-[var(--brand-primary)] [&::-webkit-details-marker]:hidden">
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 text-[var(--brand-muted)] transition group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div
        className="absolute z-30 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-black/10 bg-[var(--brand-surface)] p-1.5 shadow-lg"
        style={{ minWidth }}
      >
        {options.map((opt) => {
          if (opt.disabled) {
            return (
              <span
                key={opt.value}
                title={opt.disabledHint}
                className="block cursor-not-allowed select-none rounded-lg px-2 py-1.5 text-xs text-[var(--brand-muted)]/40"
              >
                {opt.label}
                <span className="ml-1 text-[0.6rem]">(soon)</span>
              </span>
            );
          }
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={
                "block w-full rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-[var(--brand-primary)]/10 " +
                (active
                  ? "font-semibold text-[var(--brand-primary)]"
                  : "text-[var(--brand-foreground)]")
              }
            >
              <span className="inline-flex items-center gap-1.5">
                {active && <span>✓</span>}
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </details>
  );
}
