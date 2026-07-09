import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { apiGet, apiList } from "@/lib/api";
import { getScopeContext } from "@/lib/scope";
import type {
  ProposalListItem,
  ProposalDetail,
  ProposalVersion,
} from "@/types/api";
import { StatsCard } from "@/components/ui/stats-card";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Budget — approved-spend view.
 *
 * Rolls up every APPROVED line item across the client/partner's proposals into
 * a browsable tree:
 *
 *   Budget
 *     └ <Proposal>
 *         └ <Version>
 *             └ <Section>
 *                 └ ✅ <Line item>  $total
 *
 * "Approved" is line-item level: only `line_item.approved === true` rows count,
 * so a proposal can contribute a partial set of its line items. Section/version
 * subtotals shown here are re-summed from the approved rows only, not the raw
 * proposal subtotals.
 */

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function money(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return currency.format(Number.isFinite(n) ? n : 0);
}

type ApprovedLine = {
  id: string;
  description: string;
  notes: string;
  total: number;
};

type ApprovedSection = {
  id: string;
  name: string;
  items: ApprovedLine[];
  subtotal: number;
};

type ApprovedVersion = {
  id: string;
  name: string;
  isApproved: boolean;
  sections: ApprovedSection[];
  total: number;
};

type ApprovedProposal = {
  id: string;
  name: string;
  who: string | null;
  versions: ApprovedVersion[];
  total: number;
};

/** Reduce a full proposal to only its approved line items, dropping empties. */
function toApprovedProposal(p: ProposalDetail): ApprovedProposal | null {
  const versions: ApprovedVersion[] = [];

  for (const v of [...p.versions].sort((a, b) => a.order - b.order)) {
    const sections: ApprovedSection[] = [];

    for (const s of [...v.sections].sort((a, b) => a.order - b.order)) {
      const items: ApprovedLine[] = [...s.line_items]
        .sort((a, b) => a.order - b.order)
        .filter((li) => li.approved)
        .map((li) => ({
          id: li.id,
          description: li.description,
          notes: li.notes,
          total: parseFloat(li.total || "0") || 0,
        }));

      if (items.length === 0) continue;
      const subtotal = items.reduce((sum, i) => sum + i.total, 0);
      sections.push({ id: s.id, name: s.name, items, subtotal });
    }

    if (sections.length === 0) continue;
    const total = sections.reduce((sum, s) => sum + s.subtotal, 0);
    versions.push({
      id: v.id,
      name: v.name,
      isApproved: v.is_approved,
      sections,
      total,
    });
  }

  if (versions.length === 0) return null;
  const total = versions.reduce((sum, v) => sum + v.total, 0);
  return {
    id: p.id,
    name: p.name,
    who: p.client_name || p.lead_name?.trim() || null,
    versions,
    total,
  };
}

export default async function BudgetPage() {
  const scopeCtx = await getScopeContext();
  const { activeClientIds, active } = scopeCtx;

  // 1. List proposals, scope-filter (same rule as the Proposals page).
  const allProposals = await apiList<ProposalListItem>("/api/v1/proposals/", {
    revalidate: 0,
  });

  const scopedList =
    activeClientIds === null
      ? allProposals
      : allProposals.filter(
          (p) => p.client != null && activeClientIds.includes(p.client),
        );

  // 2. Fetch details in parallel, reduce to approved-only trees.
  const details = await Promise.all(
    scopedList.map((p) =>
      apiGet<ProposalDetail>(`/api/v1/proposals/${p.id}/`, { revalidate: 0 }),
    ),
  );

  const proposals = details
    .filter((d): d is ProposalDetail => Boolean(d))
    .map(toApprovedProposal)
    .filter((p): p is ApprovedProposal => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name));

  const grandTotal = proposals.reduce((sum, p) => sum + p.total, 0);
  const approvedLineCount = proposals.reduce(
    (sum, p) =>
      sum +
      p.versions.reduce(
        (vs, v) => vs + v.sections.reduce((ss, s) => ss + s.items.length, 0),
        0,
      ),
    0,
  );

  const scopeLabel =
    active.type === "all"
      ? "across all clients"
      : `· ${active.type}: ${active.name}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-[var(--brand-muted)]">
          <span className="text-[var(--brand-foreground)]">Budget</span>
        </nav>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--brand-foreground)]">
          Budget
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Approved line items {scopeLabel}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="Approved Total" value={money(grandTotal)} />
        <StatsCard label="Approved Line Items" value={approvedLineCount} />
        <StatsCard
          label="Proposals"
          value={proposals.length}
          sub={`${scopedList.length} in scope`}
        />
      </div>

      {/* Budget tree */}
      {proposals.length === 0 ? (
        <EmptyState
          title="No approved line items yet"
          message="Once proposal line items are approved, they roll up here as budget."
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      ) : (
        <div className="space-y-6">
          {proposals.map((p) => (
            <BudgetProposal key={p.id} proposal={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Proposal → Version → Section → Line item ─────────────────────────────────

function BudgetProposal({ proposal }: { proposal: ApprovedProposal }) {
  return (
    <section
      id={`proposal-${proposal.id}`}
      className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]"
    >
      {/* Proposal header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-[var(--brand-surface-strong)] px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--brand-muted)]">
            <span>Budget</span>
            <span>/</span>
            <Link
              href={`/dashboard/proposals/${proposal.id}`}
              className="font-medium text-[var(--brand-primary)] hover:underline"
            >
              {proposal.name}
            </Link>
          </div>
          {proposal.who && (
            <p className="mt-0.5 text-sm text-[var(--brand-muted)]">{proposal.who}</p>
          )}
        </div>
        <span className="text-lg font-bold tabular-nums text-[var(--brand-foreground)]">
          {money(proposal.total)}
        </span>
      </div>

      <div className="divide-y divide-black/5">
        {proposal.versions.map((v) => (
          <BudgetVersion key={v.id} version={v} />
        ))}
      </div>
    </section>
  );
}

function BudgetVersion({ version }: { version: ApprovedVersion }) {
  return (
    <div className="px-6 py-4">
      {/* Version row */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--brand-foreground)]">
            {version.name}
          </span>
          {version.isApproved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 className="size-3" />
              Approved
            </span>
          )}
        </div>
        <span className="text-sm font-semibold tabular-nums text-[var(--brand-foreground)]">
          {money(version.total)}
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-4 pl-3">
        {version.sections.map((s) => (
          <div key={s.id}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                {s.name}
              </h4>
              <span className="text-xs font-medium tabular-nums text-[var(--brand-muted)]">
                {money(s.subtotal)}
              </span>
            </div>
            <ul className="space-y-1">
              {s.items.map((li) => (
                <li
                  key={li.id}
                  className="flex items-start justify-between gap-3 rounded-xl px-3 py-2 transition hover:bg-[var(--brand-surface-strong)]"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-[var(--brand-foreground)]">
                        {li.description}
                      </span>
                      {li.notes && (
                        <p className="text-xs text-[var(--brand-muted)]">{li.notes}</p>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-[var(--brand-foreground)]">
                    {money(li.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
