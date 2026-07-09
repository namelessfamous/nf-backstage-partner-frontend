"use client";

import { useMemo, useState } from "react";
import type { PoliticalFileRow, PoliticalColumn } from "@/lib/political-types";
import type { DeliverableFile } from "@/types/api";
import { DeliverableFileViewer } from "@/components/deliverables/file-viewer";

/**
 * CSV-style list view for a single political view (walk / call / fundraising).
 *
 * Renders each scoped file as a table whose columns come from the file's meta
 * (see src/lib/political.ts). Files that declare different column sets are
 * grouped under their own list so headers always match their rows. Each list
 * can be exported to CSV client-side.
 */

function columnsSignature(cols: PoliticalColumn[]): string {
  return cols.map((c) => `${c.key}:${c.label}`).join("|");
}

function toCsv(cols: PoliticalColumn[], rows: PoliticalFileRow[]): string {
  const esc = (v: string) => {
    if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
    return v;
  };
  const header = ["File", ...cols.map((c) => c.label)].map(esc).join(",");
  const body = rows
    .map((r) =>
      [r.name, ...cols.map((c) => r.cells[c.key] ?? "")].map(esc).join(","),
    )
    .join("\n");
  return `${header}\n${body}`;
}

function ListGroup({
  columns,
  rows,
  viewLabel,
  onOpen,
}: {
  columns: PoliticalColumn[];
  rows: PoliticalFileRow[];
  viewLabel: string;
  onOpen: (file: DeliverableFile) => void;
}) {
  const csvHref = useMemo(() => {
    const csv = toCsv(columns, rows);
    return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }, [columns, rows]);

  const filename = `${viewLabel.toLowerCase()}-list-${rows.length}.csv`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--brand-muted)]">
          {rows.length} {rows.length === 1 ? "file" : "files"}
        </p>
        <a
          href={csvHref}
          download={filename}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </a>
      </div>

      <div className="overflow-hidden overflow-x-auto rounded-3xl border border-black/5 bg-[var(--brand-surface)]">
        <table className="w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                File
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="transition hover:bg-[var(--brand-surface-strong)]/50"
              >
                <td className="px-6 py-4 font-medium text-[var(--brand-foreground)]">
                  <button
                    type="button"
                    onClick={() => onOpen(row.file)}
                    className="text-left text-[var(--brand-primary)] hover:underline"
                    title="Open file viewer"
                  >
                    {row.name}
                  </button>
                  {row.projectName && (
                    <span className="block text-xs text-[var(--brand-muted)]">
                      {row.projectName}
                    </span>
                  )}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-6 py-4 text-[var(--brand-foreground)]"
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
    </div>
  );
}

export function PoliticalListView({
  rows,
  viewLabel,
  blurb,
}: {
  rows: PoliticalFileRow[];
  viewLabel: string;
  blurb: string;
}) {
  // Group rows by their column signature so each table's header matches rows.
  const groups = useMemo(() => {
    const map = new Map<
      string,
      { columns: PoliticalColumn[]; rows: PoliticalFileRow[] }
    >();
    for (const row of rows) {
      const sig = columnsSignature(row.columns);
      const g = map.get(sig);
      if (g) g.rows.push(row);
      else map.set(sig, { columns: row.columns, rows: [row] });
    }
    return [...map.values()];
  }, [rows]);

  const [viewerFile, setViewerFile] = useState<DeliverableFile | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--brand-muted)]/25 bg-[var(--brand-surface)] px-8 py-16 text-center">
        <p className="font-medium text-[var(--brand-foreground)]">
          No {viewLabel.toLowerCase()} files in scope
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--brand-muted)]">
          {blurb} Files appear here once their{" "}
          <code className="rounded bg-[var(--brand-surface-strong)] px-1 py-0.5 text-xs">
            meta.view_template
          </code>{" "}
          is{" "}
          <code className="rounded bg-[var(--brand-surface-strong)] px-1 py-0.5 text-xs">
            {viewLabel.toLowerCase()}
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((g, i) => (
        <ListGroup
          key={i}
          columns={g.columns}
          rows={g.rows}
          viewLabel={viewLabel}
          onOpen={setViewerFile}
        />
      ))}

      {viewerFile && (
        <DeliverableFileViewer
          file={viewerFile}
          open={Boolean(viewerFile)}
          onClose={() => setViewerFile(null)}
        />
      )}
    </div>
  );
}
