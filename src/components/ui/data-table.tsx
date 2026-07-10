import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyMessage = "No data found.",
}: {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--brand-muted)]/25 bg-[var(--brand-surface)] px-6 py-14 text-center">
        <p className="text-sm text-[var(--brand-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto rounded-3xl border border-black/5 bg-[var(--brand-surface)]">
      <table className="w-full min-w-[36rem] text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs ${col.className ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-[var(--brand-surface-strong)]/50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-3 align-top text-[var(--brand-foreground)] sm:px-6 sm:py-4 ${col.className ?? ""}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
