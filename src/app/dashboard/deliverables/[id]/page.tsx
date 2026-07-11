import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { Flag, CheckCircle2, Circle, FileText } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { BackstageDeliverable } from "@/types/api";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ContentExportToolbar,
  DeliverableFileGrid,
  AddNote,
  AddAttachment,
} from "@/components/deliverables/deliverable-detail-client";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DeliverableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const deliverable = await apiGet<BackstageDeliverable>(
    `/api/v1/deliverables/${id}/`,
    { revalidate: 0 },
  );

  if (!deliverable) notFound();

  const contentHtml = deliverable.content_md
    ? await marked(deliverable.content_md)
    : null;

  const notesHtml = await Promise.all(
    (deliverable.notes_blocks ?? []).map(async (nb) => ({
      title: nb.title ?? "Note",
      html: nb.content ? await marked(nb.content) : "",
    })),
  );

  const files = deliverable.file_details ?? [];
  const milestones = deliverable.milestones ?? [];

  const dueDate = deliverable.due_to_client ?? deliverable.due_date ?? null;
  const deliveredDate =
    deliverable.delivered_to_client ?? deliverable.delivered ?? deliverable.completed ?? null;

  return (
    <div className="space-y-8 deliverable-detail-page">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--brand-muted)]">
        <Link href="/dashboard" className="hover:text-[var(--brand-primary)]">
          Deliverables
        </Link>
        <span>/</span>
        <span className="text-[var(--brand-foreground)]">{deliverable.name}</span>
      </nav>

      {/* Header card */}
      <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
                {deliverable.name}
              </h1>
              <StatusBadge status={deliverable.status} />
            </div>

            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {deliverable.client_name && (
                <div>
                  <dt className="inline text-[var(--brand-muted)]">Client: </dt>
                  <dd className="inline font-medium text-[var(--brand-foreground)]">
                    {deliverable.client_name}
                  </dd>
                </div>
              )}
              {deliverable.project_name && (
                <div>
                  <dt className="inline text-[var(--brand-muted)]">Project: </dt>
                  <dd className="inline text-[var(--brand-foreground)]">
                    {deliverable.project_slug ? (
                      <Link
                        href={`/dashboard/projects/${deliverable.project_slug}`}
                        className="font-medium text-[var(--brand-primary)] hover:opacity-80"
                      >
                        {deliverable.project_name}
                      </Link>
                    ) : (
                      deliverable.project_name
                    )}
                  </dd>
                </div>
              )}
              {dueDate && (
                <div>
                  <dt className="inline text-[var(--brand-muted)]">Due: </dt>
                  <dd className="inline text-[var(--brand-foreground)]">{formatDate(dueDate)}</dd>
                </div>
              )}
              {deliveredDate && (
                <div>
                  <dt className="inline text-[var(--brand-muted)]">Delivered: </dt>
                  <dd className="inline text-[var(--brand-foreground)]">
                    {formatDate(deliveredDate)}
                  </dd>
                </div>
              )}
              {deliverable.deliverable_type && (
                <div>
                  <dt className="inline text-[var(--brand-muted)]">Type: </dt>
                  <dd className="inline capitalize text-[var(--brand-foreground)]">
                    {deliverable.deliverable_type}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>


      {/* Files section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">Files</h2>
        <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6">
          <DeliverableFileGrid files={files} />
          <div className="mt-6">
            <AddAttachment deliverableId={id} />
          </div>
        </div>
      </section>

      {/* Content section */}
      {(contentHtml || deliverable.content_md) && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-[var(--brand-foreground)]">Content</h2>
            {deliverable.content_md && (
              <ContentExportToolbar
                contentMd={deliverable.content_md}
                deliverableId={id}
              />
            )}
          </div>
          <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8 deliverable-print-content">
            <div
              className="dl-prose"
              dangerouslySetInnerHTML={{ __html: contentHtml ?? "" }}
            />
          </div>
        </section>
      )}

      {/* Notes section */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[var(--brand-foreground)]">Notes</h2>
          <AddNote
            deliverableId={id}
            existingNotes={deliverable.notes_blocks ?? []}
          />
        </div>
        <div className="space-y-4">
          {notesHtml.length === 0 && (
            <p className="text-sm text-[var(--brand-muted)]">No notes yet.</p>
          )}
          {notesHtml.map((note, i) => (
            <article
              key={i}
              className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6"
            >
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
                <FileText className="size-3.5" />
                {note.title}
              </h3>
              <div
                className="dl-prose text-sm"
                dangerouslySetInnerHTML={{ __html: note.html }}
              />
            </article>
          ))}
        </div>
      </section>

      {/* Milestones section */}
      {milestones.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">
            Milestones
          </h2>
          <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6">
            <ul className="space-y-3">
              {milestones.map((m, i) => (
                <li key={i} className="flex items-start gap-3">
                  {m.done ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="mt-0.5 size-5 shrink-0 text-[var(--brand-muted)]/40" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        m.done
                          ? "text-[var(--brand-muted)] line-through"
                          : "text-[var(--brand-foreground)]"
                      }`}
                    >
                      {m.label}
                    </p>
                    {m.note && (
                      <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{m.note}</p>
                    )}
                  </div>
                  {m.date && (
                    <span className="shrink-0 text-xs text-[var(--brand-muted)]">
                      {formatDate(m.date)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {/* Milestone summary */}
            <div className="mt-4 flex items-center gap-3 border-t border-black/5 pt-4">
              <Flag className="size-4 text-[var(--brand-muted)]" />
              <span className="text-xs text-[var(--brand-muted)]">
                {milestones.filter((m) => m.done).length} of {milestones.length} complete
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
