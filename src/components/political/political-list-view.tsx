"use client";

import { useState } from "react";
import type {
  PoliticalListRow,
  PoliticalColumn,
} from "@/lib/political-types";

/**
 * List view for a single political view (walk / call / fundraising).
 *
 * Each list is a DataStore segment built over the client's master voter file.
 * We render one card per segment: header (name + live count + source file), a
 * bounded preview table of resolved rows, and a "Download full CSV" button
 * that streams the entire resolved segment from the backend through the
 * same-origin export proxy (auth is injected server-side).
 */

function ExportButton({ segment }: { segment: PoliticalListRow }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/political/segments/${encodeURIComponent(segment.id)}/export`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${segment.slug || segment.view}-${segment.count}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90 disabled:opacity-50"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {busy ? "Preparing…" : "Download full CSV"}
      </button>
      {err && <span className="text-[0.65rem] text-red-500">{err}</span>}
    </div>
  );
}

function PreviewTable({
  columns,
  segment,
}: {
  columns: PoliticalColumn[];
  segment: PoliticalListRow;
}) {
  if (segment.preview.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--brand-muted)]/25 bg-[var(--brand-surface)] px-6 py-10 text-center text-sm text-[var(--brand-muted)]">
        This list has no rows yet.
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto rounded-2xl border border-black/5 bg-[var(--brand-surface)]">
      <table className="w-full min-w-[34rem] text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {segment.preview.map((row) => (
            <tr
              key={row.id}
              className="transition hover:bg-[var(--brand-surface-strong)]/50"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-3 py-3 align-top text-[var(--brand-foreground)] sm:px-6 sm:py-4"
                >
                  {row.cells[col.key] || (
                    <span className="text-[var(--brand-muted)]/40">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SegmentCard({ segment }: { segment: PoliticalListRow }) {
  return (
    <div className="space-y-3 rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-[var(--brand-foreground)] sm:text-base">
            {segment.name}
          </h3>
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
        </div>
        <ExportButton segment={segment} />
      </div>

      <PreviewTable columns={segment.columns} segment={segment} />

      {segment.hasMore && (
        <p className="text-[0.7rem] text-[var(--brand-muted)]">
          Showing first {segment.preview.length.toLocaleString()} of{" "}
          {segment.count.toLocaleString()} — download the full CSV for the
          complete list.
        </p>
      )}
    </div>
  );
}

export function PoliticalListView({
  lists,
  viewLabel,
  blurb,
}: {
  lists: PoliticalListRow[];
  viewLabel: string;
  blurb: string;
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
    <div className="space-y-6">
      {lists.map((segment) => (
        <SegmentCard key={segment.id} segment={segment} />
      ))}
    </div>
  );
}
