import Link from "next/link";
import { StatsCard } from "@/components/ui/stats-card";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalLists,
  getPoliticalStores,
  scopeHasPoliticalNiche,
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
  type PoliticalListRow,
  type PoliticalStore,
  type PoliticalView,
} from "@/lib/political";

/**
 * Voter-file (political) summary block for the dashboard.
 *
 * Extracted into its own async server component so the master-voter-file data
 * pipeline — stores → per-store segments → per-segment resolve previews, the
 * heaviest fetch on the dashboard — streams in behind a <Suspense> boundary
 * instead of blocking the core dashboard (stats / review / activity) from
 * painting. For a political scope this is the single biggest first-paint win.
 *
 * Degrades to null on any failure or for non-political scopes, exactly as the
 * inline version did.
 */
export async function PoliticalSummary() {
  const scopeCtx = await getScopeContext();
  if (!scopeHasPoliticalNiche(scopeCtx)) return null;

  let politicalGrouped: Record<PoliticalView, PoliticalListRow[]> = {
    walk: [],
    call: [],
    fundraising: [],
  };
  let politicalStores: PoliticalStore[] = [];
  try {
    [politicalGrouped, politicalStores] = await Promise.all([
      getPoliticalLists(scopeCtx),
      getPoliticalStores(scopeCtx),
    ]);
  } catch {
    // Degrade gracefully — never break the main dashboard.
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          Master Voter File
        </h2>
        <Link
          href="/dashboard/political"
          className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
        >
          View political module →
        </Link>
      </div>

      {/* Aggregate stats — row count from master voter file store, not segment sums */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <StatsCard
          label="Voter File Records"
          value={politicalStores
            .reduce((n, s) => n + s.rowCount, 0)
            .toLocaleString()}
          sub={
            politicalStores.length === 1
              ? politicalStores[0].name
              : `${politicalStores.length} voter files`
          }
        />
        <StatsCard label="Walk Lists" value={politicalGrouped.walk.length} />
        <StatsCard label="Call Lists" value={politicalGrouped.call.length} />
        <StatsCard
          label="Fundraising Lists"
          value={politicalGrouped.fundraising.length}
        />
      </div>

      {/* Compact submodule links */}
      <div className="grid gap-3 sm:grid-cols-3">
        {POLITICAL_VIEWS.map((view) => {
          const meta = POLITICAL_VIEW_META[view];
          const lists = politicalGrouped[view];
          const records = lists.reduce((n, seg) => n + seg.count, 0);
          return (
            <Link
              key={view}
              href={`/dashboard/political/${view}`}
              className="group flex items-center justify-between rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)]/40 px-4 py-3 transition hover:bg-[var(--brand-surface-strong)]/70"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--brand-foreground)] group-hover:text-[var(--brand-primary)]">
                  {meta.label}
                </p>
                <p className="text-xs text-[var(--brand-muted)]">
                  {lists.length} {lists.length === 1 ? "list" : "lists"}
                </p>
              </div>
              <span className="text-sm font-bold tabular-nums text-[var(--brand-foreground)]">
                {records.toLocaleString()}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Skeleton shown while {@link PoliticalSummary} streams in. */
export function PoliticalSummarySkeleton() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          Master Voter File
        </h2>
        <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-[var(--brand-accent)] border-t-[var(--brand-primary)]" />
        <span className="text-xs text-[var(--brand-muted)]">
          Preparing voter-file analytics…
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] p-4"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-black/5" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-black/10" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)]/30"
          />
        ))}
      </div>
    </section>
  );
}
