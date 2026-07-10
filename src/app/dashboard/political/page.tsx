import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalLists,
  scopeHasPoliticalNiche,
  POLITICAL_VIEWS,
} from "@/lib/political";
import { StatsCard } from "@/components/ui/stats-card";
import { PoliticalTabs } from "@/components/political/political-tabs";

export const dynamic = "force-dynamic";

export default async function PoliticalPage() {
  const scopeCtx = await getScopeContext();

  // Gate: only political / public-affairs scope may view this page.
  // Direct-URL access outside that niche bounces back to the dashboard.
  if (!scopeHasPoliticalNiche(scopeCtx)) {
    redirect("/dashboard");
  }

  const grouped = await getPoliticalLists(scopeCtx);

  const scopeHeading =
    scopeCtx.active.type === "partner" || scopeCtx.active.type === "client"
      ? `Political — ${scopeCtx.active.name}`
      : "Political";

  // Total voters/records across every list in scope.
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatsCard label="Walk Lists" value={grouped.walk.length} />
        <StatsCard label="Call Lists" value={grouped.call.length} />
        <StatsCard
          label="Fundraising Lists"
          value={grouped.fundraising.length}
          sub={`${totalRecords.toLocaleString()} records`}
        />
      </div>

      {/* Views */}
      <PoliticalTabs grouped={grouped} />
    </div>
  );
}
