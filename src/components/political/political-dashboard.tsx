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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GeoType = "county" | "ld" | "sd";
type ElectionType = "primary" | "general";

interface AppliedSegment {
  id: string;
  name: string;
  filter: FilterDef;
}

interface CurrentFilter {
  geoType: GeoType;
  geoValue: string;
  election: ElectionType;
  segment?: AppliedSegment | null;
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
 * Combines geo rule + segment filter under an AND. Returns null when there
 * are no active rules (pass nothing to backend = whole file).
 */
function buildEffectiveFilter(cf: CurrentFilter): FilterDef | null {
  const rules: FilterDef["rules"] = [];

  if (cf.geoType === "county" && cf.geoValue) {
    rules.push({ key: "CountyName", cmp: "eq", value: cf.geoValue });
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
  activeStoreId,
}: PoliticalDashboardProps) {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [currentFilter, setCurrentFilter] = useState<CurrentFilter>({
    geoType: initialGeoType,
    geoValue: initialGeoValue,
    election: initialElection,
    segment: null,
  });

  // ── Analytics state (client-side, filter-aware) ───────────────────────────
  const [analytics, setAnalytics] = useState<VoterAnalytics | null>(
    initialAnalytics,
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const fetchControllerRef = useRef<AbortController | null>(null);

  // ── Derived effective filter_def ──────────────────────────────────────────
  const effectiveFilter = buildEffectiveFilter(currentFilter);

  // Fetch analytics whenever filter or election changes
  const fetchAnalytics = useCallback(
    async (cf: CurrentFilter, storeId: string) => {
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      const ctrl = new AbortController();
      fetchControllerRef.current = ctrl;

      setAnalyticsLoading(true);
      try {
        const eff = buildEffectiveFilter(cf);
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
      {/* ── 1. TITLE BLOCK ─────────────────────────────────────────────── */}
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--brand-muted)]">
          Political
        </p>
        <h1 className="mt-0.5 text-3xl font-semibold text-[var(--brand-foreground)] sm:text-4xl">
          Dashboard
        </h1>
        {clientSubtitle && (
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            Client — {clientSubtitle}
          </p>
        )}
      </div>

      {/* ── 2. LIST BUILDING nav cards (moved to top) ──────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
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
                  <span className="text-xs text-[var(--brand-muted)]">
                    {lists.length === 1 ? "list" : "lists"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 3. CAMPAIGN OPERATIONS (moved to top) ──────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          Campaign Operations
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href={VIEW_HREFS.mail}
            className="group block rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-5 transition hover:bg-[var(--brand-surface-strong)]/70 hover:shadow-sm"
          >
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
              <span className="text-xs text-[var(--brand-muted)]">mail grid</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4. FILTERS BAR ─────────────────────────────────────────────── */}
      {voterFiles.length > 0 && (
        <div className="rounded-3xl bg-[var(--brand-surface-strong)]/40 border border-black/5 p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Voter file picker (only when multiple files) */}
            {voterFiles.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                  Voter File
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {voterFiles.map((s) => {
                    const active = s.id === activeStore?.id;
                    const params = new URLSearchParams({
                      ...baseParams,
                      store: s.id,
                    });
                    return (
                      <Link
                        key={s.id}
                        href={`?${params.toString()}`}
                        scroll={false}
                        className={
                          active
                            ? "rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--brand-on-primary,#111111)]"
                            : "rounded-full bg-[var(--brand-surface-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)]"
                        }
                      >
                        {s.name} ({s.rowCount.toLocaleString()})
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Saved segments dropdown */}
            {segmentsByView.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                  Segments
                </span>
                <details className="group relative inline-block">
                  <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-[var(--brand-surface-strong)] px-3.5 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)] [&::-webkit-details-marker]:hidden">
                    Saved Segments ({storeSegments.length})
                    <span className="transition group-open:rotate-90">›</span>
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
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                Geography
              </span>
              <div className="flex items-center gap-2">
                {/* GeoType selector */}
                <div className="inline-flex rounded-full bg-[var(--brand-surface-strong)] p-0.5">
                  {(
                    [
                      { value: "county", label: "County" },
                      { value: "ld", label: "LD", disabled: true },
                      { value: "sd", label: "SD", disabled: true },
                    ] as { value: GeoType; label: string; disabled?: boolean }[]
                  ).map((opt) => {
                    if (opt.disabled) {
                      return (
                        <span
                          key={opt.value}
                          title="Coming soon — backend has no LD/SD column mapping yet"
                          className="rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--brand-muted)]/40 cursor-not-allowed select-none"
                        >
                          {opt.label}
                        </span>
                      );
                    }
                    const active = currentFilter.geoType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setCurrentFilter((prev) => ({
                            ...prev,
                            geoType: opt.value,
                            geoValue: "",
                          }))
                        }
                        className={
                          active
                            ? "rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--brand-on-primary,#111111)]"
                            : "rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)]"
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* County value selector */}
                {currentFilter.geoType === "county" && countyOptions.length > 0 && (
                  <GeoValueSelect
                    options={countyOptions}
                    current={currentFilter.geoValue}
                    onSelect={(val) =>
                      setCurrentFilter((prev) => ({ ...prev, geoValue: val }))
                    }
                  />
                )}

                {/* LD/SD coming-soon note */}
                {(currentFilter.geoType === "ld" || currentFilter.geoType === "sd") && (
                  <span className="text-[0.7rem] text-[var(--brand-muted)] italic">
                    Coming soon — no backend column mapping yet
                  </span>
                )}
              </div>
            </div>

            {/* Election type toggle */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                Frequency
              </span>
              <div className="inline-flex rounded-full bg-[var(--brand-surface-strong)] p-0.5">
                {(["primary", "general"] as ElectionType[]).map((opt) => {
                  const active = currentFilter.election === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setCurrentFilter((prev) => ({ ...prev, election: opt }))
                      }
                      className={
                        active
                          ? "rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--brand-on-primary,#111111)]"
                          : "rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)]"
                      }
                    >
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </button>
                  );
                })}
              </div>
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
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
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
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full bg-[var(--brand-surface-strong)] px-3 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)] [&::-webkit-details-marker]:hidden">
        {label}
        <span className="transition group-open:rotate-90">›</span>
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
