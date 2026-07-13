import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import { scopeHasPoliticalNiche } from "@/lib/political";
import { apiList } from "@/lib/api";
import { parseMailPieceData, fmtCurrency } from "@/lib/mail-piece";
import type { BackstageDeliverable, Project } from "@/types/api";
import { MailGrid, type MailGridGroup } from "@/components/political/mail-grid";
import { StatsCard } from "@/components/ui/stats-card";

export const dynamic = "force-dynamic";

export default async function PoliticalMailPage() {
  const scopeCtx = await getScopeContext();

  // Gate: must have a political-niche client in scope
  if (!scopeHasPoliticalNiche(scopeCtx)) {
    redirect("/dashboard");
  }

  const { activeClientIds, active, isClientOnly } = scopeCtx;

  // Fetch all deliverables scoped to active partner/client
  let deliverablesPath = "/api/v1/deliverables/?deliverable_type=mail";
  if (active.type === "partner") {
    deliverablesPath += `&partner=${encodeURIComponent(active.slug)}`;
  } else if (active.type === "client") {
    deliverablesPath += `&client=${encodeURIComponent(active.slug)}`;
  }

  const allDeliverables = await apiList<BackstageDeliverable>(deliverablesPath, {
    revalidate: 0,
  });

  // Belt-and-suspenders: filter by activeClientIds
  const mailDeliverables =
    activeClientIds === null
      ? allDeliverables
      : allDeliverables.filter(
          (d) => d.client_id != null && activeClientIds.includes(d.client_id),
        );

  // Group by project
  const projectMap = new Map<string, { name: string; status: string; items: BackstageDeliverable[] }>();
  for (const d of mailDeliverables) {
    const pid = d.project;
    if (!projectMap.has(pid)) {
      projectMap.set(pid, {
        name: d.project_name ?? pid,
        status: "active",
        items: [],
      });
    }
    projectMap.get(pid)!.items.push(d);
  }

  // Build groups sorted by project name
  const groups: MailGridGroup[] = Array.from(projectMap.entries())
    .sort(([, a], [, b]) => a.name.localeCompare(b.name))
    .map(([projectId, { name, status, items }]) => ({
      projectId,
      projectName: name,
      projectStatus: status,
      rows: items.map((d) => ({
        deliverable: d,
        mailPiece: parseMailPieceData(d.notes_blocks),
      })),
    }));

  // Summary stats
  const totalPieces = mailDeliverables.length;
  const totalUnits = mailDeliverables.reduce((sum, d) => {
    const mp = parseMailPieceData(d.notes_blocks);
    return sum + (mp.units ?? 0);
  }, 0);
  const totalCost = mailDeliverables.reduce((sum, d) => {
    const mp = parseMailPieceData(d.notes_blocks);
    return sum + (mp.totalCost ?? 0);
  }, 0);
  const invoicedCount = mailDeliverables.filter((d) => {
    const mp = parseMailPieceData(d.notes_blocks);
    return mp.invoiced === true;
  }).length;

  const scopeHeading =
    active.type === "partner" || active.type === "client"
      ? `Direct Mail — ${active.name}`
      : "Direct Mail";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
          {scopeHeading}
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Campaign direct-mail tracking — grouped by election cycle. Manage
          pieces, universe sizes, costs, print status, and drop dates.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <StatsCard label="Mail Pieces" value={totalPieces} />
        <StatsCard
          label="Total Units"
          value={totalUnits > 0 ? totalUnits.toLocaleString() : "—"}
        />
        <StatsCard
          label="Total Cost"
          value={totalCost > 0 ? fmtCurrency(totalCost) : "—"}
        />
        <StatsCard
          label="Invoiced"
          value={`${invoicedCount} / ${totalPieces}`}
          sub={totalPieces > 0 ? `${Math.round((invoicedCount / totalPieces) * 100)}%` : undefined}
        />
      </div>

      {/* Mail grid — read-only for client, editable for partner/admin */}
      <MailGrid groups={groups} readOnly={isClientOnly} />
    </div>
  );
}
