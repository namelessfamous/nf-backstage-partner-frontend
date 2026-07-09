import Link from "next/link";
import { apiList } from "@/lib/api";
import { getScopeContext } from "@/lib/scope";
import type { ProposalListItem, ProposalStatus } from "@/types/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const ALL_STATUSES: { value: ProposalStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "proposal.draft", label: "Draft" },
  { value: "proposal.ready", label: "Ready" },
  { value: "proposal.revision_request", label: "Revision" },
  { value: "proposal.approved", label: "Approved" },
  { value: "proposal.void", label: "Void" },
  { value: "proposal.cancelled", label: "Cancelled" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const activeStatus = (status ?? "all") as ProposalStatus | "all";

  // Resolve scope so we can restrict proposals to the active partner/client.
  const scopeCtx = await getScopeContext();
  const { active, activeClientIds } = scopeCtx;

  const allProposals = await apiList<ProposalListItem>("/api/v1/proposals/", {
    revalidate: 0,
  });

  // Scope filtering:
  //   - "all" scope (activeClientIds === null): show everything
  //   - partner/client scope: only proposals whose client UUID is in scope.
  //     Lead-only proposals (client === null) are hidden outside "all" scope
  //     because they are not yet attached to a partner's client.
  const scopedProposals =
    activeClientIds === null
      ? allProposals
      : allProposals.filter(
          (p) => p.client != null && activeClientIds.includes(p.client),
        );

  // Filter by status
  let filtered =
    activeStatus === "all"
      ? scopedProposals
      : scopedProposals.filter((p) => p.status === activeStatus);

  // Filter by search query (name / client / project / lead)
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.client_name ?? "").toLowerCase().includes(needle) ||
        (p.project_name ?? "").toLowerCase().includes(needle) ||
        (p.lead_name ?? "").toLowerCase().includes(needle),
    );
  }

  // Count by status for tab badges
  const countByStatus = ALL_STATUSES.slice(1).reduce<Record<string, number>>(
    (acc, s) => {
      acc[s.value] = scopedProposals.filter((p) => p.status === s.value).length;
      return acc;
    },
    {},
  );

  const scopeLabel =
    active.type === "all"
      ? null
      : active.type === "partner"
        ? `partner: ${active.name}`
        : active.type === "client"
          ? `client: ${active.name}`
          : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">Proposals</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          {scopedProposals.length} proposal{scopedProposals.length !== 1 ? "s" : ""}
          {scopeLabel ? ` · ${scopeLabel}` : " across all clients"}
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map(({ value, label }) => {
          const isActive = activeStatus === value;
          const count =
            value === "all"
              ? scopedProposals.length
              : (countByStatus[value] ?? 0);
          // Hide empty status tabs (except "all") to keep the row tidy.
          if (value !== "all" && count === 0 && !isActive) return null;
          return (
            <Link
              key={value}
              href={
                value === "all"
                  ? "/dashboard/proposals"
                  : `/dashboard/proposals?status=${value}`
              }
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm"
                  : "bg-[var(--brand-surface-strong)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--brand-muted)]/15 text-[var(--brand-muted)]"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form method="get" className="flex gap-3">
        {activeStatus !== "all" && (
          <input type="hidden" name="status" value={activeStatus} />
        )}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search proposals…"
          className="w-full max-w-sm rounded-2xl border border-black/10 bg-[var(--brand-surface)] px-4 py-2.5 text-sm text-[var(--brand-foreground)] outline-none placeholder:text-[var(--brand-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
        />
        <button
          type="submit"
          className="rounded-2xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90"
        >
          Search
        </button>
        {q && (
          <a
            href={
              activeStatus === "all"
                ? "/dashboard/proposals"
                : `/dashboard/proposals?status=${activeStatus}`
            }
            className="rounded-2xl border border-black/10 px-4 py-2.5 text-sm text-[var(--brand-muted)] transition hover:border-black/20"
          >
            Clear
          </a>
        )}
      </form>

      {/* Proposal list */}
      {filtered.length === 0 ? (
        <EmptyState
          title={
            q
              ? `No proposals match "${q}"`
              : "No proposals"
          }
          message="Proposals in this scope will appear here."
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Proposal</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Client / Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Versions</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Created</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((p) => {
                  const who =
                    p.client_name ||
                    (p.lead_name && p.lead_name.trim()) ||
                    (p.lead ? "Lead" : "—");
                  return (
                    <tr
                      key={p.id}
                      className="group transition hover:bg-[var(--brand-surface-strong)]/50"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/proposals/${p.id}`}
                          className="font-medium text-[var(--brand-foreground)] hover:text-[var(--brand-primary)]"
                        >
                          {p.name}
                        </Link>
                        {p.project_name && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--brand-muted)]">
                            {p.project_name}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--brand-muted)]">{who}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-6 py-4 text-center tabular-nums text-[var(--brand-foreground)]">
                        {p.version_count}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[var(--brand-muted)]">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/proposals/${p.id}`}
                          className="text-xs font-medium text-[var(--brand-primary)] opacity-0 transition group-hover:opacity-100"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
