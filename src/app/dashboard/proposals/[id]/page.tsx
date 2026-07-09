import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { apiGet } from "@/lib/api";
import type { ProposalDetail } from "@/types/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProposalViewer } from "@/components/proposals/proposal-viewer";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const proposal = await apiGet<ProposalDetail>(`/api/v1/proposals/${id}/`, {
    revalidate: 0,
  });

  if (!proposal) notFound();

  const notesHtml = proposal.notes?.trim()
    ? await marked(proposal.notes)
    : null;

  const who = proposal.client_name || proposal.lead_name?.trim() || null;

  // Grand totals across versions for the header summary.
  const approvedVersion = proposal.versions.find((v) => v.is_approved) ?? null;

  return (
    <div className="space-y-8 proposal-detail-page">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--brand-muted)] proposal-print-hide">
        <Link href="/dashboard/proposals" className="hover:text-[var(--brand-primary)]">
          Proposals
        </Link>
        <span>/</span>
        <span className="text-[var(--brand-foreground)]">{proposal.name}</span>
      </nav>

      {/* Header card */}
      <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
                {proposal.name}
              </h1>
              <StatusBadge status={proposal.status} />
            </div>

            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {who && (
                <div>
                  <dt className="inline text-[var(--brand-muted)]">
                    {proposal.client_name ? "Client: " : "Lead: "}
                  </dt>
                  <dd className="inline font-medium text-[var(--brand-foreground)]">
                    {who}
                  </dd>
                </div>
              )}
              {proposal.project_name && (
                <div>
                  <dt className="inline text-[var(--brand-muted)]">Project: </dt>
                  <dd className="inline text-[var(--brand-foreground)]">
                    {proposal.project_name}
                  </dd>
                </div>
              )}
              <div>
                <dt className="inline text-[var(--brand-muted)]">Versions: </dt>
                <dd className="inline text-[var(--brand-foreground)]">
                  {proposal.version_count}
                </dd>
              </div>
              <div>
                <dt className="inline text-[var(--brand-muted)]">Created: </dt>
                <dd className="inline text-[var(--brand-foreground)]">
                  {formatDate(proposal.created_at)}
                </dd>
              </div>
              <div>
                <dt className="inline text-[var(--brand-muted)]">Updated: </dt>
                <dd className="inline text-[var(--brand-foreground)]">
                  {formatDate(proposal.updated_at)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Approved-total mini stat */}
          {approvedVersion && (
            <div className="rounded-2xl bg-[var(--brand-surface-strong)] px-5 py-3 text-center">
              <p className="text-2xl font-semibold tabular-nums text-[var(--brand-foreground)]">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(parseFloat(approvedVersion.total || "0"))}
              </p>
              <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                Approved: {approvedVersion.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {notesHtml && (
        <section className="proposal-print-hide">
          <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">
            Notes
          </h2>
          <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8">
            <div
              className="dl-prose text-sm"
              dangerouslySetInnerHTML={{ __html: notesHtml }}
            />
          </div>
        </section>
      )}

      {/* Versions + line items viewer (client component with tabs) */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)] proposal-print-hide">
          Versions &amp; Pricing
        </h2>
        <ProposalViewer proposal={proposal} />
      </section>
    </div>
  );
}
