import Link from "next/link";
import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalLists,
  scopeHasPoliticalNiche,
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
} from "@/lib/political";
import { StatsCard } from "@/components/ui/stats-card";

export const dynamic = "force-dynamic";

const VIEW_HREFS: Record<string, string> = {
  walk: "/dashboard/political/walk",
  call: "/dashboard/political/call",
  fundraising: "/dashboard/political/fundraising",
};

export default async function PoliticalPage() {
  const scopeCtx = await getScopeContext();

  // Gate: only political / public-affairs scope may view this page.
  if (!scopeHasPoliticalNiche(scopeCtx)) {
    redirect("/dashboard");
  }

  const grouped = await getPoliticalLists(scopeCtx);

  const scopeHeading =
    scopeCtx.active.type === "partner" || scopeCtx.active.type === "client"
      ? `Political — ${scopeCtx.active.name}`
      : "Political";

  // Total records across every view.
  const totalRecords = POLITICAL_VIEWS.reduce(
    (n, v) => n + grouped[v].reduce((m, seg) => m + seg.count, 0),
    0,
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
          {scopeHeading}
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Walk, call, and fundraising lists built from your master voter file —
          download any list as CSV.
        </p>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatsCard label="Walk Lists" value={grouped.walk.length} />
        <StatsCard label="Call Lists" value={grouped.call.length} />
        <StatsCard
          label="Fundraising Lists"
          value={grouped.fundraising.length}
          sub={`${totalRecords.toLocaleString()} records`}
        />
      </div>

      {/* Submodule navigation cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {POLITICAL_VIEWS.map((view) => {
            const meta = POLITICAL_VIEW_META[view];
            const lists = grouped[view];
            const records = lists.reduce((n, seg) => n + seg.count, 0);
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
                    {records.toLocaleString()} records
                  </span>
                </div>
                <p className="mt-0.5 text-[0.65rem] text-[var(--brand-muted)]">
                  {lists.length === 1 ? "list" : "lists"}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
