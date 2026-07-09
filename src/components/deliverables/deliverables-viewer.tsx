"use client";

// Deliverables list — rows navigate to /dashboard/deliverables/<id>
// Status filter chips retained. Accordion expand removed.

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { DeliverableFile } from "@/types/api";

export interface DeliverableItemView {
  id: string;
  name: string;
  type: string;
  status: string;
  projectName?: string;
  projectSlug?: string;
  clientName?: string;
  dueDate?: string | null;
  deliveredDate?: string | null;
  contentHtml?: string;
  notes: { title: string; html: string }[];
  links: { label: string; url: string; kind: "dropbox" | "drive" | "youtube" }[];
  files: DeliverableFile[];
  milestones: { label: string; date?: string; done?: boolean; note?: string }[];
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "delivered", label: "Delivered" },
];

const TYPE_DOT: Record<string, string> = {
  creative: "bg-[var(--brand-primary)]",
  strategy: "bg-[var(--brand-accent)]",
};

export function DeliverablesViewer({ items }: { items: DeliverableItemView[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const item of items) c[item.status] = (c[item.status] ?? 0) + 1;
    return c;
  }, [items]);

  const visible = useMemo(
    () => (statusFilter === "all" ? items : items.filter((i) => i.status === statusFilter)),
    [items, statusFilter],
  );

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.filter((f) => f.value === "all" || (counts[f.value] ?? 0) > 0).map(
          (f) => {
            const active = statusFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-on-primary)]"
                    : "border-black/10 bg-[var(--brand-surface)] text-[var(--brand-muted)] hover:border-[var(--brand-primary)]/40"
                }`}
              >
                {f.label}
                <span className={`ml-1.5 tabular-nums ${active ? "opacity-80" : "opacity-60"}`}>
                  {counts[f.value] ?? 0}
                </span>
              </button>
            );
          },
        )}
      </div>

      {/* Deliverables list */}
      <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]">
        {visible.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No deliverables"
              message="Deliverables will appear here as work is scoped and produced."
            />
          </div>
        ) : (
          visible.map((item, index) => {
            const isLast = index === visible.length - 1;
            return (
              <Link
                key={item.id}
                href={`/dashboard/deliverables/${item.id}`}
                className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--brand-surface-strong)]/40 ${
                  isLast ? "" : "border-b border-black/5"
                }`}
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${TYPE_DOT[item.type] ?? "bg-slate-300"}`}
                  title={item.type}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--brand-foreground)]">
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--brand-muted)]">
                    {[item.clientName, item.projectName].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {item.dueDate && (
                  <span className="hidden shrink-0 text-xs text-[var(--brand-muted)] sm:inline">
                    Due {item.dueDate}
                  </span>
                )}
                <StatusBadge status={item.status} />
                <ChevronRight className="size-4 shrink-0 text-[var(--brand-muted)]/60" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
