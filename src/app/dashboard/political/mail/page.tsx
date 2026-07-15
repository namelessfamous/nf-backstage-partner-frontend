import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import { scopeHasPoliticalNiche } from "@/lib/political";
import { apiList } from "@/lib/api";
import { parseMailPieceData, isMailPiece, fmtCurrency } from "@/lib/mail-piece";
import type { BackstageDeliverable, Project } from "@/types/api";
import { MailGrid, type MailGridGroup } from "@/components/political/mail-grid";
import { Mail, Receipt, DollarSign, CheckSquare } from "lucide-react";
import { StatsCard } from "@/components/ui/stats-card";
import {
  PoliticalModuleHeader,
  scopeSubtitle,
} from "@/components/political/political-module-header";

export const dynamic = "force-dynamic";

export default async function PoliticalMailPage() {
  const scopeCtx = await getScopeContext();

  // Gate: must have a political-niche client in scope
  if (!scopeHasPoliticalNiche(scopeCtx)) {
    redirect("/dashboard");
  }

  const { activeClientIds, active, isClientOnly } = scopeCtx;

  // Fetch deliverables scoped to active partner/client. The backend ignores an
  // unknown deliverable_type query param, so we CANNOT rely on it to select mail
  // pieces — we filter client-side by the presence of the mail_piece notes block
  // (the authoritative signal). Not every deliverable in an election-cycle
  // project is a mail piece.
  let deliverablesPath = "/api/v1/deliverables/";
  if (active.type === "partner") {
    deliverablesPath += `?partner=${encodeURIComponent(active.slug)}`;
  } else if (active.type === "client") {
    deliverablesPath += `?client=${encodeURIComponent(active.slug)}`;
  }

  const allDeliverables = await apiList<BackstageDeliverable>(deliverablesPath, {
    revalidate: 0,
  });

  // Scope filter (activeClientIds) THEN mail-piece filter (has mail_piece block).
  const scopedDeliverables =
    activeClientIds === null
      ? allDeliverables
      : allDeliverables.filter(
          (d) => d.client_id != null && activeClientIds.includes(d.client_id),
        );
  const mailDeliverables = scopedDeliverables.filter((d) =>
    isMailPiece(d.notes_blocks),
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

  return (
    <div className="space-y-8">
      {/* Header — matches /dashboard/political title pattern */}
      <PoliticalModuleHeader
        title="Direct Mail"
        clientSubtitle={scopeSubtitle(active)}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <StatsCard label="Mail Pieces" value={totalPieces} icon={Mail} />
        <StatsCard
          label="Total Units"
          value={totalUnits > 0 ? totalUnits.toLocaleString() : "—"}
          icon={Receipt}
        />
        <StatsCard
          label="Total Cost"
          value={totalCost > 0 ? fmtCurrency(totalCost) : "—"}
          icon={DollarSign}
        />
        <StatsCard
          label="Invoiced"
          value={`${invoicedCount} / ${totalPieces}`}
          sub={totalPieces > 0 ? `${Math.round((invoicedCount / totalPieces) * 100)}%` : undefined}
          icon={CheckSquare}
        />
      </div>

      {/* Mail grid — read-only for client, editable for partner/admin */}
      <MailGrid groups={groups} readOnly={isClientOnly} />
    </div>
  );
}
