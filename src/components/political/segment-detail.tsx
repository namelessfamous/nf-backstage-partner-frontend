/**
 * SegmentDetailContent — shared server-renderable content for the per-list
 * detail pages (/dashboard/political/<view>/<segmentId>).
 *
 * Renders: breadcrumb/back link, header (list name + count + store),
 * the full SegmentTable CSV viewer with drawer, Download CSV button,
 * and the ResponseSummary panel (Change 3).
 *
 * Each view's detail page (walk/[segmentId], call/[segmentId],
 * fundraising/[segmentId]) calls this with its own view constant.
 *
 * This is a SERVER COMPONENT (no "use client" — it composes client components).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PoliticalView } from "@/lib/political-types";
import type { PoliticalListRow } from "@/lib/political-types";
import { SegmentTable } from "@/components/political/segment-table";
import { ResponseSummary } from "@/components/political/response-summary";
import { ExportButton } from "@/components/political/export-button";

const VIEW_LABELS: Record<PoliticalView, string> = {
  walk: "Walk",
  call: "Call",
  fundraising: "Fundraising",
};

export interface SegmentDetailContentProps {
  view: PoliticalView;
  segment: PoliticalListRow | undefined;
}

export function SegmentDetailContent({
  view,
  segment,
}: SegmentDetailContentProps) {
  if (!segment) {
    notFound();
  }

  const viewLabel = VIEW_LABELS[view];
  const backHref = `/dashboard/political/${view}`;

  return (
    <div className="space-y-8">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2 text-xs text-[var(--brand-muted)]">
        <Link
          href="/dashboard/political"
          className="hover:text-[var(--brand-foreground)] transition"
        >
          Political
        </Link>
        <span>/</span>
        <Link
          href={backHref}
          className="hover:text-[var(--brand-foreground)] transition"
        >
          {viewLabel}
        </Link>
        <span>/</span>
        <span className="text-[var(--brand-foreground)] font-medium truncate max-w-[18rem]">
          {segment.name}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
            {segment.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            <span className="font-medium tabular-nums text-[var(--brand-foreground)]">
              {segment.count.toLocaleString()}
            </span>{" "}
            {segment.count === 1 ? "record" : "records"}
            {" · "}
            <span title="Source master voter file">{segment.storeName}</span>
            {segment.clientName ? ` · ${segment.clientName}` : ""}
          </p>
          {segment.description && (
            <p className="mt-1.5 text-sm leading-6 text-[var(--brand-muted)]">
              {segment.description}
            </p>
          )}
        </div>
        <ExportButton segment={segment} />
      </div>

      {/* Full SegmentTable CSV viewer */}
      <div className="rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-4 sm:p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          Records
        </p>
        <SegmentTable
          segmentId={segment.id}
          segmentName={segment.name}
          storeName={segment.storeName}
          slug={segment.slug}
          columns={segment.columns}
          initialCount={segment.count}
        />
      </div>

      {/* Response Summary (Change 3) */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          Response Tracking
        </h2>
        <ResponseSummary segmentId={segment.id} />
      </div>

      {/* Back link */}
      <div>
        <Link
          href={backHref}
          className="text-sm font-medium text-[var(--brand-primary)] hover:underline"
        >
          ← Back to {viewLabel} Lists
        </Link>
      </div>
    </div>
  );
}
