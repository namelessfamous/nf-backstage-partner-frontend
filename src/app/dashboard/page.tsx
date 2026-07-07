import { marked } from "marked";
import { apiList } from "@/lib/api";
import { getScopeContext } from "@/lib/scope";
import type { BackstageDeliverable } from "@/types/api";
import { StatsCard } from "@/components/ui/stats-card";
import {
  DeliverablesViewer,
  type DeliverableItemView,
} from "@/components/deliverables/deliverables-viewer";

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function md(content?: string): string | undefined {
  const trimmed = content?.trim();
  if (!trimmed) return undefined;
  return marked.parse(trimmed, { async: false }) as string;
}

const STATUS_RANK: Record<string, number> = {
  review: 0,
  in_progress: 1,
  pending: 2,
  approved: 3,
  delivered: 4,
};

function toView(d: BackstageDeliverable): DeliverableItemView {
  const links: DeliverableItemView["links"] = [];
  if (d.dropbox_url) links.push({ label: "Dropbox", url: d.dropbox_url, kind: "dropbox" });
  if (d.google_drive_url)
    links.push({ label: "Google Drive", url: d.google_drive_url, kind: "drive" });
  if (d.youtube_url) links.push({ label: "YouTube", url: d.youtube_url, kind: "youtube" });

  const notes = (d.notes_blocks ?? [])
    .map((block) => ({ title: block.title?.trim() || "Notes", html: md(block.content) }))
    .filter((n): n is { title: string; html: string } => Boolean(n.html));

  return {
    id: d.id,
    name: d.name,
    type: d.deliverable_type ?? "creative",
    status: d.status,
    projectName: d.project_name,
    projectSlug: d.project_slug,
    clientName: d.client_name,
    dueDate: formatDate(d.due_to_client ?? d.due_date),
    deliveredDate: formatDate(d.delivered_to_client ?? d.delivered ?? null),
    contentHtml: md(d.content_md),
    notes,
    links,
    files: (d.file_details ?? []).map((f) => ({ id: f.id, name: f.name, url: f.url })),
    milestones: (d.milestones ?? [])
      .filter((m) => m.label)
      .map((m) => ({
        label: m.label as string,
        date: formatDate(m.date ?? null) ?? undefined,
        done: Boolean(m.done),
        note: m.note,
      })),
  };
}

export default async function DashboardPage() {
  // Resolve scope first so we can build a targeted API URL
  const scopeCtx = await getScopeContext();

  // Build scoped deliverables URL — backend now filters server-side;
  // client-side filter below is belt-and-suspenders.
  let deliverablesPath = "/api/v1/deliverables/";
  if (scopeCtx.active.type === "partner") {
    deliverablesPath += `?partner=${encodeURIComponent(scopeCtx.active.slug)}`;
  } else if (scopeCtx.active.type === "client") {
    deliverablesPath += `?client=${encodeURIComponent(scopeCtx.active.slug)}`;
  }

  const allDeliverables = await apiList<BackstageDeliverable>(deliverablesPath, { revalidate: 0 });

  const { activeClientIds, active } = scopeCtx;

  // Filter deliverables by active scope using the client_id field from the serializer.
  // client_id is the UUID of the project's client; null means a top-level project.
  const deliverables =
    activeClientIds === null
      ? allDeliverables
      : allDeliverables.filter(
          (d) => d.client_id != null && activeClientIds.includes(d.client_id),
        );

  const sorted = [...deliverables].sort((a, b) => {
    const rank = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
    if (rank !== 0) return rank;
    const aDue = a.due_to_client ?? a.due_date ?? "9999";
    const bDue = b.due_to_client ?? b.due_date ?? "9999";
    return aDue.localeCompare(bDue);
  });

  const items = sorted.map(toView);

  const inFlight = deliverables.filter((d) =>
    ["pending", "in_progress", "review"].includes(d.status),
  ).length;
  const inReview = deliverables.filter((d) => d.status === "review").length;
  const done = deliverables.filter((d) =>
    ["approved", "delivered"].includes(d.status),
  ).length;

  // Heading reflects active scope
  const scopeHeading =
    active.type === "all"
      ? "Deliverables"
      : active.type === "partner"
        ? `${active.name} — Deliverables`
        : `${active.name} — Deliverables`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
          {scopeHeading}
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Everything we&apos;re producing for you, in one place.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard label="In Flight" value={inFlight} />
        <StatsCard label="Awaiting Your Review" value={inReview} />
        <StatsCard label="Delivered" value={done} sub={`${deliverables.length} total`} />
      </div>

      {/* Deliverables viewer */}
      <DeliverablesViewer items={items} />
    </div>
  );
}
