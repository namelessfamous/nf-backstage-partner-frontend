import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalLists,
  scopeHasPoliticalNiche,
  POLITICAL_VIEW_META,
} from "@/lib/political";
import { StatsCard } from "@/components/ui/stats-card";
import { PoliticalListView } from "@/components/political/political-list-view";

export const dynamic = "force-dynamic";

// views to be customized later

export default async function PoliticalFundraisingPage() {
  const scopeCtx = await getScopeContext();

  if (!scopeHasPoliticalNiche(scopeCtx)) {
    redirect("/dashboard");
  }

  const grouped = await getPoliticalLists(scopeCtx);
  const lists = grouped.fundraising;
  const meta = POLITICAL_VIEW_META.fundraising;

  const totalRecords = lists.reduce((n, seg) => n + seg.count, 0);
  const largestList = lists.length > 0 ? Math.max(...lists.map((s) => s.count)) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
          Political Fundraising Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">{meta.blurb}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <StatsCard label="Fundraising Lists" value={lists.length} />
        <StatsCard
          label="Total Records"
          value={totalRecords.toLocaleString()}
          sub="across all fundraising lists"
        />
        <StatsCard
          label="Largest List"
          value={largestList > 0 ? largestList.toLocaleString() : "—"}
          sub="records"
        />
        <StatsCard
          label="Conversion Rate"
          value="—"
          sub="response tracking coming soon"
        />
      </div>

      {/* List view — reuses existing per-list card + preview table + CSV export */}
      <PoliticalListView
        lists={lists}
        viewLabel={meta.label}
        blurb={meta.blurb}
      />
    </div>
  );
}
