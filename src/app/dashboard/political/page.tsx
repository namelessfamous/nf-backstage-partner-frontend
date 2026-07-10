import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalRows,
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

  const grouped = await getPoliticalRows(scopeCtx);

  const scopeHeading =
    scopeCtx.active.type === "partner" || scopeCtx.active.type === "client"
      ? `Political — ${scopeCtx.active.name}`
      : "Political";

  const total = POLITICAL_VIEWS.reduce((n, v) => n + grouped[v].length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
          {scopeHeading}
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Walk, call, and fundraising lists for your field program — export any
          view to CSV.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Walk Files" value={grouped.walk.length} />
        <StatsCard label="Call Files" value={grouped.call.length} />
        <StatsCard
          label="Fundraising Files"
          value={grouped.fundraising.length}
          sub={`${total} total`}
        />
      </div>

      {/* Views */}
      <PoliticalTabs grouped={grouped} />
    </div>
  );
}
