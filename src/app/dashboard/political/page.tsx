import Link from "next/link";
import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalLists,
  getPoliticalStores,
  getVoterAnalytics,
  scopeHasPoliticalNiche,
  politicalClientsInReach,
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
} from "@/lib/political";
import { PoliticalScopePrompt } from "@/components/political/political-scope-prompt";
import { StatsCard } from "@/components/ui/stats-card";
import {
  BarChart,
  HBars,
  WidgetCard,
  partyColor,
  genderColor,
} from "@/components/political/analytics-widgets";
import { AnalyticsToggle } from "@/components/political/analytics-toggle";
import {
  SegmentFilterDropdown,
  segmentsForStore,
} from "@/components/political/segment-filter-dropdown";
import type { VoterAnalyticsBar } from "@/lib/political-types";

export const dynamic = "force-dynamic";

const VIEW_HREFS: Record<string, string> = {
  walk: "/dashboard/political/walk",
  call: "/dashboard/political/call",
  fundraising: "/dashboard/political/fundraising",
};

type ElectionType = "primary" | "general";
type Weight = "precinct" | "county";

export default async function PoliticalPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; election?: string; weight?: string }>;
}) {
  const scopeCtx = await getScopeContext();

  // Gate: the political dashboard requires a political / public-affairs client
  // in the ACTIVE scope (Task 5).
  if (!scopeHasPoliticalNiche(scopeCtx)) {
    // If the user can reach political clients through another scope, offer a
    // scope picker instead of silently bouncing. If none exist at all, there's
    // nothing political to show — send them back to the dashboard.
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

  // Only master voter files (not donor/contact) drive the analytics widgets.
  const voterFiles = politicalStores.filter(
    (s) => s.kind === "voter_file" && s.rowCount > 0,
  );

  const activeStore =
    voterFiles.find((s) => s.id === sp.store) ?? voterFiles[0] ?? null;
  const electionType: ElectionType = sp.election === "general" ? "general" : "primary";
  const weight: Weight = sp.weight === "county" ? "county" : "precinct";

  const analytics = activeStore
    ? await getVoterAnalytics(activeStore.id, {
        electionType,
        weight,
        top: 25,
      })
    : null;

  const scopeHeading =
    scopeCtx.active.type === "partner" || scopeCtx.active.type === "client"
      ? `Political — ${scopeCtx.active.name}`
      : "Political";

  const voterFileTotal = politicalStores.reduce((n, s) => n + s.rowCount, 0);

  // Party share KPIs
  const totalOfficial =
    analytics?.official_party.reduce((s, d) => s + d.value, 0) ?? 0;
  const repCount =
    analytics?.official_party.find((d) => d.label.toLowerCase().startsWith("rep"))
      ?.value ?? 0;
  const demCount =
    analytics?.official_party.find((d) => d.label.toLowerCase().startsWith("dem"))
      ?.value ?? 0;
  const repShare = totalOfficial ? (repCount / totalOfficial) * 100 : 0;
  const demShare = totalOfficial ? (demCount / totalOfficial) * 100 : 0;

  const baseParams: Record<string, string> = {
    ...(activeStore ? { store: activeStore.id } : {}),
    election: electionType,
    weight,
  };

  // Segments of the active voter-file store, for the per-row Filter dropdowns.
  const storeSegments = activeStore
    ? segmentsForStore(grouped, activeStore.id)
    : [];

  // Per-row Filter dropdown factory for horizontal-bar widgets.
  const rowFilter = (colLabel: string) => (bar: VoterAnalyticsBar) => (
    <SegmentFilterDropdown
      col={bar.filter_col}
      val={bar.filter_val}
      label={colLabel}
      segments={storeSegments}
      align="right"
    />
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
          {scopeHeading}
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Voter-file analytics — party, turnout frequency, demographics, and
          weighted precinct targeting from your master voter file.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <StatsCard
          label="Voters Analyzed"
          value={
            analytics
              ? analytics.analyzed_rows.toLocaleString()
              : voterFileTotal.toLocaleString()
          }
          sub={activeStore?.name ?? `${voterFiles.length} voter files`}
        />
        <StatsCard
          label="Republican"
          value={totalOfficial ? `${repShare.toFixed(1)}%` : "—"}
          sub={totalOfficial ? `${repCount.toLocaleString()} voters` : undefined}
        />
        <StatsCard
          label="Democrat"
          value={totalOfficial ? `${demShare.toFixed(1)}%` : "—"}
          sub={totalOfficial ? `${demCount.toLocaleString()} voters` : undefined}
        />
        <StatsCard
          label="Median Age"
          value={
            analytics?.age_stats.median != null
              ? String(analytics.age_stats.median)
              : "—"
          }
          sub={
            analytics?.age_stats.mean != null
              ? `mean ${analytics.age_stats.mean}`
              : undefined
          }
        />
      </div>

      {/* Analytics controls */}
      {voterFiles.length > 0 && (
        <div className="flex flex-wrap items-end gap-4 rounded-3xl bg-[var(--brand-surface-strong)]/40 p-4">
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

          <AnalyticsToggle
            paramKey="election"
            current={electionType}
            labelText="Election Type"
            baseParams={baseParams}
            options={[
              { value: "primary", label: "Primary" },
              { value: "general", label: "General" },
            ]}
          />
          <AnalyticsToggle
            paramKey="weight"
            current={weight}
            labelText="Weight By"
            baseParams={baseParams}
            options={[
              { value: "precinct", label: "Precincts" },
              { value: "county", label: "Counties" },
            ]}
          />
        </div>
      )}

      {/* Analytics widgets */}
      {activeStore && analytics ? (
        <div className="space-y-4">
          {/* Party breakdowns */}
          <div className="grid gap-4 md:grid-cols-2">
            <WidgetCard title="Official Party" subtitle="Registered party of record">
              <HBars
                data={analytics.official_party}
                colorFn={partyColor}
                renderRowAction={rowFilter("Party")}
              />
            </WidgetCard>
            <WidgetCard
              title="Household Party"
              subtitle="Party composition by household"
            >
              <HBars
                data={analytics.household_party}
                colorFn={partyColor}
                renderRowAction={rowFilter("Household Party")}
              />
            </WidgetCard>
          </div>

          {/* Frequency + Gender */}
          <div className="grid gap-4 md:grid-cols-2">
            <WidgetCard
              title="Voter Frequency"
              subtitle={`${
                electionType === "primary" ? "Primary" : "General"
              } elections voted (of last 4 cycles)`}
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
            <WidgetCard title="Gender">
              <HBars
                data={analytics.gender}
                colorFn={genderColor}
                renderRowAction={rowFilter("Gender")}
              />
            </WidgetCard>
          </div>

          {/* Age histogram */}
          <WidgetCard
            title="Age Distribution"
            subtitle={
              analytics.age_stats.count
                ? `${analytics.age_stats.count.toLocaleString()} voters · ${
                    analytics.age_stats.min
                  }–${analytics.age_stats.max} yrs · median ${
                    analytics.age_stats.median
                  }`
                : undefined
            }
          >
            <BarChart data={analytics.age_histogram} height={220} />
          </WidgetCard>

          {/* Weighted ranking */}
          <WidgetCard
            title={`Weighted ${weight === "county" ? "County" : "Precinct"} Ranking`}
            subtitle={`${
              electionType === "primary" ? "Primary" : "General"
            } frequency ÷ 4 — highest-turnout targets first`}
          >
            {analytics.weighted_ranking.length ? (
              <div className="overflow-hidden rounded-2xl border border-black/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--brand-surface-strong)]/60 text-left text-xs text-[var(--brand-muted)]">
                      <th className="px-3 py-2 font-medium">#</th>
                      <th className="px-3 py-2 font-medium">
                        {weight === "county" ? "County" : "County–Precinct"}
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Weighted Votes
                      </th>
                      <th className="px-3 py-2 text-right font-medium">Filter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.weighted_ranking.map((r, i) => (
                      <tr
                        key={r.label}
                        className="border-t border-black/5 text-[var(--brand-foreground)]"
                      >
                        <td className="px-3 py-2 text-[var(--brand-muted)]">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.value.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <SegmentFilterDropdown
                            col={r.filter_col}
                            val={r.filter_val}
                            label={weight === "county" ? "County" : "Precinct"}
                            segments={storeSegments}
                            align="right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-[var(--brand-muted)]">
                This voter file has no precinct/frequency columns.
              </p>
            )}
          </WidgetCard>

          {/* County counts */}
          {analytics.county_counts.length > 1 && (
            <WidgetCard
              title="County Counts"
              subtitle="Voters per county in this file"
            >
              <HBars
                data={analytics.county_counts.slice(0, 20)}
                colorFn={() => "var(--brand-primary)"}
                renderRowAction={rowFilter("County")}
              />
            </WidgetCard>
          )}
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

      {/* Submodule navigation cards — walk / call / fundraising list building */}
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
    </div>
  );
}
