import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalLists,
  getPoliticalStores,
  scopeHasPoliticalNiche,
  POLITICAL_VIEW_META,
} from "@/lib/political";
import { StatsCard } from "@/components/ui/stats-card";
import { PoliticalListView } from "@/components/political/political-list-view";

export const dynamic = "force-dynamic";

export default async function PoliticalCallPage() {
  const scopeCtx = await getScopeContext();

  if (!scopeHasPoliticalNiche(scopeCtx)) {
    redirect("/dashboard");
  }

  const [grouped, politicalStores] = await Promise.all([
    getPoliticalLists(scopeCtx),
    getPoliticalStores(scopeCtx),
  ]);

  const lists = grouped.call;
  const meta = POLITICAL_VIEW_META.call;

  // Change 1: Voter file total = store row_count sum, not segment sum.
  const voterFileTotal = politicalStores.reduce((n, s) => n + s.rowCount, 0);
  const largestList = lists.length > 0 ? Math.max(...lists.map((s) => s.count)) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
          Political Call Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">{meta.blurb}</p>
      </div>

      {/* Stats row — Change 1: voter file total from store, not segment sum */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatsCard label="Call Lists" value={lists.length} />
        <StatsCard
          label="Voter File Records"
          value={voterFileTotal.toLocaleString()}
          sub="master voter file"
        />
        <StatsCard
          label="Largest List"
          value={largestList > 0 ? largestList.toLocaleString() : "—"}
          sub="records"
        />
      </div>

      {/* Change 2: Overview/index of lists with links to detail pages */}
      <PoliticalListView
        lists={lists}
        viewLabel={meta.label}
        blurb={meta.blurb}
        view="call"
      />
    </div>
  );
}
