import Link from "next/link";
import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalLists,
  getPoliticalStores,
  getVoterAnalytics,
  getFilteredVoterCount,
  scopeHasPoliticalNiche,
  politicalClientsInReach,
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
} from "@/lib/political";
import { PoliticalScopePrompt } from "@/components/political/political-scope-prompt";
import { StatsCard } from "@/components/ui/stats-card";
import {
  HBars,
  WidgetCard,
  partyColor,
} from "@/components/political/analytics-widgets";
import { AnalyticsToggle } from "@/components/political/analytics-toggle";
import {
  SegmentFilterDropdown,
  segmentsForStore,
} from "@/components/political/segment-filter-dropdown";
import { VoterListView } from "@/components/political/voter-list-view";
import type { VoterAnalyticsBar } from "@/lib/political-types";

export const dynamic = "force-dynamic";

const VIEW_HREFS: Record<string, string> = {
  walk: "/dashboard/political/walk",
  call: "/dashboard/political/call",
  fundraising: "/dashboard/political/fundraising",
  mail: "/dashboard/political/mail",
};

type ElectionType = "primary" | "general";
type GeoType = "county" | "ld" | "sd";

export default async function PoliticalPage({
  searchParams,
}: {
  searchParams: Promise<{
    store?: string;
    election?: string;
    weight?: string;
    geoType?: string;
    geoValue?: string;
  }>;
}) {
  const scopeCtx = await getScopeContext();

  // ── Niche gate (unchanged) ──────────────────────────────────────────────
  if (!scopeHasPoliticalNiche(scopeCtx)) {
    const reachable = politicalClientsInReach(scopeCtx);
    if (reachable.length === 0) {
      redirect("/dashboard");
    }
    return (
      <PoliticalScopePrompt
        clients={reachable.map((c) => ({
          slug: c.slug,
          name: c.name,
          partnerName: c.partner_name ?? null,
        }))}
      />
    );
  }

  const sp = await searchParams;

  const [grouped, politicalStores] = await Promise.all([
    getPoliticalLists(scopeCtx),
    getPoliticalStores(scopeCtx),
  ]);

  // Only master voter files drive the analytics widgets.
  const voterFiles = politicalStores.filter(
    (s) => s.kind === "voter_file" && s.rowCount > 0,
  );

  const activeStore =
    voterFiles.find((s) => s.id === sp.store) ?? voterFiles[0] ?? null;
  const electionType: ElectionType =
    sp.election === "general" ? "general" : "primary";
  const geoType: GeoType =
    sp.geoType === "ld" ? "ld" : sp.geoType === "sd" ? "sd" : "county";
  const geoValue: string = sp.geoValue ?? "";

  const analytics = activeStore
    ? await getVoterAnalytics(activeStore.id, {
        electionType,
        weight: "county", // always county for overview
        top: 25,
      })
    : null;

  // Total Count reflects the applied geography filter. analytics is NOT
  // filter-aware, so when a county is selected we ask the backend `preview`
  // action for the true filtered row count. Falls back to the whole-file
  // analyzed/row count when no filter is active or the count fetch soft-fails.
  const filteredCount =
    activeStore && geoType === "county" && geoValue
      ? await getFilteredVoterCount(activeStore.id, {
          col: "CountyName",
          val: geoValue,
        })
      : null;

  // ── Title / subtitle ─────────────────────────────────────────────────────
  let clientSubtitle: string | null = null;
  if (
    scopeCtx.active.type === "client" ||
    scopeCtx.active.type === "partner"
  ) {
    clientSubtitle = scopeCtx.active.name;
  } else if (activeStore?.clientName) {
    clientSubtitle = activeStore.clientName;
  }

  // ── Shared URL params ────────────────────────────────────────────────────
  const baseParams: Record<string, string> = {
    ...(activeStore ? { store: activeStore.id } : {}),
    election: electionType,
    geoType,
    ...(geoValue ? { geoValue } : {}),
  };

  // ── Party KPIs ───────────────────────────────────────────────────────────
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

  // ── Segments for filter dropdowns ────────────────────────────────────────
  const storeSegments = activeStore
    ? segmentsForStore(grouped, activeStore.id)
    : [];

  const rowFilter = (colLabel: string) => (bar: VoterAnalyticsBar) => (
    <SegmentFilterDropdown
      col={bar.filter_col}
      val={bar.filter_val}
      label={colLabel}
      segments={storeSegments}
      align="right"
    />
  );

  // ── County options for geo picker ─────────────────────────────────────────
  const countyOptions = (analytics?.county_counts ?? []).map((c) => c.label);

  // ── Geo filter for voter list ─────────────────────────────────────────────
  // Only county is supported in the backend today.
  const voterListFilter =
    geoType === "county" && geoValue
      ? { col: "CountyName", val: geoValue, label: "County" }
      : null;

  // ── Columns for voter list ────────────────────────────────────────────────
  // Derive from active store columns or fall back to empty array (component will
  // use whatever keys the rows contain).
  const voterColumns = (activeStore?.columns ?? [])
    .filter((c) => c.key)
    .map((c) => ({ key: c.key, label: c.label ?? c.key }));

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

      {/* ── 2 + 3. FILTERS BAR ─────────────────────────────────────────── */}
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
                            ? "rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--brand-on-primary,#fff)]"
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
            {storeSegments.length > 0 && (
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
                    {POLITICAL_VIEWS.map((view) => {
                      const segsForView = storeSegments.filter(
                        (s) => s.view === view,
                      );
                      if (segsForView.length === 0) return null;
                      return (
                        <div key={view} className="py-0.5">
                          <p className="px-2 pb-0.5 pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--brand-muted)]/70">
                            {POLITICAL_VIEW_META[view].label}
                          </p>
                          {segsForView.map((seg) => (
                            <Link
                              key={seg.id}
                              href={`/dashboard/political/${seg.view}/${seg.id}`}
                              className="block rounded-lg px-2 py-1.5 text-xs text-[var(--brand-foreground)] transition hover:bg-[var(--brand-primary)]/10"
                            >
                              {seg.name}
                            </Link>
                          ))}
                        </div>
                      );
                    })}
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
                    const active = geoType === opt.value;
                    const params = new URLSearchParams({
                      ...baseParams,
                      geoType: opt.value,
                    });
                    // Clear geoValue when switching geoType
                    params.delete("geoValue");
                    return (
                      <Link
                        key={opt.value}
                        href={`?${params.toString()}`}
                        scroll={false}
                        className={
                          active
                            ? "rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--brand-on-primary,#fff)]"
                            : "rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)]"
                        }
                      >
                        {opt.label}
                      </Link>
                    );
                  })}
                </div>

                {/* County value selector */}
                {geoType === "county" && countyOptions.length > 0 && (
                  <GeoValueSelect
                    options={countyOptions}
                    current={geoValue}
                    baseParams={baseParams}
                    geoType="county"
                  />
                )}

                {/* LD/SD coming-soon note */}
                {(geoType === "ld" || geoType === "sd") && (
                  <span className="text-[0.7rem] text-[var(--brand-muted)] italic">
                    Coming soon — no backend column mapping yet
                  </span>
                )}
              </div>
            </div>

            {/* Election type toggle */}
            <AnalyticsToggle
              paramKey="election"
              current={electionType}
              labelText="Frequency"
              baseParams={baseParams}
              options={[
                { value: "primary", label: "Primary" },
                { value: "general", label: "General" },
              ]}
            />
          </div>
        </div>
      )}

      {/* ── 4. STATS ROW ───────────────────────────────────────────────── */}
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
          {/* Total Count — reflects geo filter when county is selected */}
          <StatsCard
            label="Total Voters"
            value={
              filteredCount != null
                ? filteredCount.toLocaleString()
                : analytics
                  ? analytics.analyzed_rows.toLocaleString()
                  : (activeStore?.rowCount ?? 0).toLocaleString()
            }
            sub={
              geoValue && geoType === "county"
                ? `${geoValue} County${filteredCount == null ? " (filtering…)" : ""}`
                : activeStore?.name ?? `${voterFiles.length} voter files`
            }
          />

          {/* Republican */}
          <StatsCard
            label="Republican"
            value={totalOfficial ? `${repShare.toFixed(1)}%` : "—"}
            sub={
              totalOfficial
                ? `${repCount.toLocaleString()} voters${geoValue ? " · whole file" : ""}`
                : undefined
            }
          />

          {/* Democrat */}
          <StatsCard
            label="Democrat"
            value={totalOfficial ? `${demShare.toFixed(1)}%` : "—"}
            sub={
              totalOfficial
                ? `${demCount.toLocaleString()} voters${geoValue ? " · whole file" : ""}`
                : undefined
            }
          />

          {/* Other */}
          <StatsCard
            label="Other / Unaffiliated"
            value={totalOfficial ? `${otherShare.toFixed(1)}%` : "—"}
            sub={
              totalOfficial
                ? `${otherCount.toLocaleString()} voters${geoValue ? " · whole file" : ""}`
                : undefined
            }
          />
        </div>

        {/* Muted note when a geo filter is active — analytics not filter-aware */}
        {geoValue && (
          <p className="mt-2 text-[0.7rem] text-[var(--brand-muted)] italic">
            ℹ️ Party &amp; frequency figures reflect the <strong>whole voter file</strong>.
            The analytics endpoint does not support geography filtering server-side.
          </p>
        )}
      </div>

      {/* Analytics widgets (party / frequency / by-tags placeholder) */}
      {activeStore && analytics ? (
        <div className="space-y-4">
          {/* Party + Tags row */}
          <div className="grid gap-4 md:grid-cols-3">
            <WidgetCard
              title="Official Party"
              subtitle={
                geoValue
                  ? "Whole file — analytics not filter-aware"
                  : "Registered party of record"
              }
            >
              <HBars
                data={analytics.official_party}
                colorFn={partyColor}
                renderRowAction={rowFilter("Party")}
              />
            </WidgetCard>

            <WidgetCard
              title="Voter Frequency"
              subtitle={`${electionType === "primary" ? "Primary" : "General"} elections voted (of last 4 cycles)${geoValue ? " · whole file" : ""}`}
            >
              <HBars
                data={analytics.frequency}
                colorFn={() => "var(--brand-primary)"}
                renderRowAction={rowFilter(
                  electionType === "primary"
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

      {/* ── 5. VOTER LIST ──────────────────────────────────────────────── */}
      {activeStore ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            Voter File
            {geoValue && geoType === "county"
              ? ` — ${geoValue} County`
              : ""}
          </h2>
          <div className="rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/30 p-4 sm:p-5">
            {voterColumns.length > 0 ? (
              <VoterListView
                storeId={activeStore.id}
                storeName={activeStore.name}
                columns={voterColumns}
                initialCount={activeStore.rowCount}
                initialFilter={voterListFilter}
              />
            ) : (
              <p className="py-6 text-center text-sm text-[var(--brand-muted)]">
                This voter file has no column schema defined yet.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {/* ── List Building nav cards (preserved, moved below voter list) ── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          List Building
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {POLITICAL_VIEWS.map((view) => {
            const meta = POLITICAL_VIEW_META[view];
            const lists = grouped[view];
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

      {/* ── Campaign Operations (preserved) ────────────────────────────── */}
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
    </div>
  );
}

// ── GeoValueSelect — server component link-based county picker ────────────
// Native <select> needs "use client". We use a small details/links pattern
// instead to stay server-only, consistent with SegmentFilterDropdown + AnalyticsToggle.

function GeoValueSelect({
  options,
  current,
  baseParams,
  geoType,
}: {
  options: string[];
  current: string;
  baseParams: Record<string, string>;
  geoType: GeoType;
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
          <Link
            href={`?${new URLSearchParams({ ...baseParams, geoType, geoValue: "" }).toString()}`}
            scroll={false}
            className="block rounded-lg px-2 py-1.5 text-xs text-[var(--brand-muted)] transition hover:bg-[var(--brand-primary)]/10"
          >
            All counties
          </Link>
        )}
        {options.map((opt) => (
          <Link
            key={opt}
            href={`?${new URLSearchParams({ ...baseParams, geoType, geoValue: opt }).toString()}`}
            scroll={false}
            className={`block rounded-lg px-2 py-1.5 text-xs transition hover:bg-[var(--brand-primary)]/10 ${
              opt === current
                ? "font-semibold text-[var(--brand-primary)]"
                : "text-[var(--brand-foreground)]"
            }`}
          >
            {opt}
          </Link>
        ))}
      </div>
    </details>
  );
}
