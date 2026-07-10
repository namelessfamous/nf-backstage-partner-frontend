"use client";

/**
 * PoliticalListView — compact overview/index of lists for a political view.
 *
 * Renders one card per segment showing: name, record count, source store,
 * description, and a "View list →" link to the per-list detail page.
 *
 * Changed from the heavy inline-SegmentTable design (Change 2): the full CSV
 * viewer and response summary now live on the detail page
 * (/dashboard/political/<view>/<segmentId>). The export button remains here
 * for quick access.
 */

import Link from "next/link";
import type { PoliticalListRow } from "@/lib/political-types";
import { ExportButton } from "@/components/political/export-button";

function ListCard({
  segment,
  view,
}: {
  segment: PoliticalListRow;
  view: string;
}) {
  const detailHref = `/dashboard/political/${view}/${segment.id}`;

  return (
    <div className="rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: metadata */}
        <div className="min-w-0 flex-1">
          <Link
            href={detailHref}
            className="group inline-block"
          >
            <h3 className="truncate text-sm font-semibold text-[var(--brand-foreground)] transition group-hover:text-[var(--brand-primary)] sm:text-base">
              {segment.name}
            </h3>
          </Link>
          <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
            <span className="font-medium tabular-nums text-[var(--brand-foreground)]">
              {segment.count.toLocaleString()}
            </span>{" "}
            {segment.count === 1 ? "record" : "records"}
            {" · "}
            <span title="Source master voter file">{segment.storeName}</span>
            {segment.clientName ? ` · ${segment.clientName}` : ""}
          </p>
          {segment.description && (
            <p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">
              {segment.description}
            </p>
          )}

          {/* Column chips — lightweight preview of schema, no data rows */}
          {segment.columns.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {segment.columns.slice(0, 6).map((col) => (
                <span
                  key={col.key}
                  className="inline-flex items-center rounded-md border border-black/5 bg-[var(--brand-surface)] px-2 py-0.5 text-[0.65rem] text-[var(--brand-muted)]"
                >
                  {col.label}
                </span>
              ))}
              {segment.columns.length > 6 && (
                <span className="inline-flex items-center text-[0.65rem] text-[var(--brand-muted)]">
                  +{segment.columns.length - 6} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <ExportButton segment={segment} />
          <Link
            href={detailHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-primary)] hover:underline"
          >
            View list →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function PoliticalListView({
  lists,
  viewLabel,
  blurb,
  view,
}: {
  lists: PoliticalListRow[];
  viewLabel: string;
  blurb: string;
  /** The view slug ("walk" | "call" | "fundraising") — used for detail hrefs. */
  view: string;
}) {
  if (lists.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--brand-muted)]/25 bg-[var(--brand-surface)] px-8 py-16 text-center">
        <p className="font-medium text-[var(--brand-foreground)]">
          No {viewLabel.toLowerCase()} lists in scope
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--brand-muted)]">
          {blurb} Lists appear here once a{" "}
          <code className="rounded bg-[var(--brand-surface-strong)] px-1 py-0.5 text-xs">
            {viewLabel.toLowerCase()}
          </code>{" "}
          segment is built over your assigned master voter file.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lists.map((segment) => (
        <ListCard key={segment.id} segment={segment} view={view} />
      ))}
    </div>
  );
}
