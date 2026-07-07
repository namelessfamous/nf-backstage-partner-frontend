import type { ProjectStatus, DeliverableStatus } from "@/types/api";

type Status = ProjectStatus | DeliverableStatus | string;

const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  // Project statuses
  draft: { label: "Draft", classes: "bg-slate-100 text-slate-600" },
  active: { label: "Active", classes: "bg-emerald-50 text-emerald-700" },
  on_hold: { label: "On Hold", classes: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", classes: "bg-blue-50 text-blue-700" },
  archived: { label: "Archived", classes: "bg-slate-100 text-slate-500" },
  // Deliverable statuses
  pending: { label: "Pending", classes: "bg-slate-100 text-slate-500" },
  review: { label: "In Review", classes: "bg-violet-50 text-violet-700" },
  approved: { label: "Approved", classes: "bg-blue-50 text-blue-700" },
  not_started: { label: "Not Started", classes: "bg-slate-100 text-slate-500" },
  in_progress: { label: "In Progress", classes: "bg-amber-50 text-amber-700" },
  in_review: { label: "In Review", classes: "bg-violet-50 text-violet-700" },
  delivered: { label: "Delivered", classes: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", classes: "bg-red-50 text-red-600" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_MAP[status] ?? {
    label: status.replace(/_/g, " "),
    classes: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
