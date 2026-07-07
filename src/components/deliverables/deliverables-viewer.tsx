"use client";

// Adapted from shadcn.io block: dashboard-support-tickets
// (expandable AnimatePresence rows), re-skinned to partner brand tokens.

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  ExternalLink,
  FileText,
  Paperclip,
  Play,
  Flag,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

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
  files: { id: string; name: string; url: string | null }[];
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
  const [expanded, setExpanded] = useState<string | null>(null);

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
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
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
            const isExpanded = expanded === item.id;
            const isLast = index === visible.length - 1;
            const hasDetails =
              Boolean(item.contentHtml) ||
              item.notes.length > 0 ||
              item.links.length > 0 ||
              item.files.length > 0 ||
              item.milestones.length > 0;

            return (
              <div key={item.id} className={isLast ? "" : "border-b border-black/5"}>
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--brand-surface-strong)]/40"
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
                  <ChevronRight
                    className={`size-4 shrink-0 text-[var(--brand-muted)]/60 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-5 border-t border-black/5 bg-[var(--brand-surface-strong)]/20 px-5 py-5 sm:px-8">
                        {!hasDetails && (
                          <p className="text-sm text-[var(--brand-muted)]">
                            No additional detail yet — check back soon.
                          </p>
                        )}

                        {item.contentHtml && (
                          <div
                            className="dl-prose text-sm"
                            // Content is authored in backstage by our own team.
                            dangerouslySetInnerHTML={{ __html: item.contentHtml }}
                          />
                        )}

                        {item.milestones.length > 0 && (
                          <div>
                            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
                              <Flag className="size-3.5" /> Milestones
                            </h4>
                            <ul className="space-y-1.5">
                              {item.milestones.map((m, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm">
                                  {m.done ? (
                                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                  ) : (
                                    <Circle className="size-4 shrink-0 text-[var(--brand-muted)]/40" />
                                  )}
                                  <span
                                    className={
                                      m.done
                                        ? "text-[var(--brand-muted)] line-through"
                                        : "text-[var(--brand-foreground)]"
                                    }
                                  >
                                    {m.label}
                                  </span>
                                  {m.date && (
                                    <span className="text-xs text-[var(--brand-muted)]">
                                      {m.date}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {item.notes.map((note, i) => (
                          <div key={i}>
                            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
                              <FileText className="size-3.5" /> {note.title}
                            </h4>
                            <div
                              className="dl-prose text-sm"
                              dangerouslySetInnerHTML={{ __html: note.html }}
                            />
                          </div>
                        ))}

                        {(item.links.length > 0 || item.files.length > 0) && (
                          <div className="flex flex-wrap gap-2">
                            {item.links.map((link) => (
                              <a
                                key={link.url}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[var(--brand-surface)] px-3 py-1.5 text-xs font-medium text-[var(--brand-foreground)] transition hover:border-[var(--brand-primary)]/40"
                              >
                                {link.kind === "youtube" ? (
                                  <Play className="size-3.5" />
                                ) : (
                                  <ExternalLink className="size-3.5" />
                                )}
                                {link.label}
                              </a>
                            ))}
                            {item.files.map((file) =>
                              file.url ? (
                                <a
                                  key={file.id}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[var(--brand-surface)] px-3 py-1.5 text-xs font-medium text-[var(--brand-foreground)] transition hover:border-[var(--brand-primary)]/40"
                                >
                                  <Paperclip className="size-3.5" />
                                  {file.name}
                                </a>
                              ) : null,
                            )}
                          </div>
                        )}

                        {(item.deliveredDate || item.projectSlug) && (
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--brand-muted)]">
                            {item.deliveredDate && <span>Delivered {item.deliveredDate}</span>}
                            {item.projectSlug && (
                              <Link
                                href={`/dashboard/projects/${item.projectSlug}`}
                                className="font-medium text-[var(--brand-primary)] hover:opacity-80"
                              >
                                View project →
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
