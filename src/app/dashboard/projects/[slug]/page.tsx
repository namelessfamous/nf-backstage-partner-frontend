import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, apiList } from "@/lib/api";
import type { ProjectDetail, Deliverable, ProjectNote } from "@/types/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-US", opts ?? {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [project, deliverables, notes] = await Promise.all([
    apiGet<ProjectDetail>(`/api/v1/projects/${slug}/`),
    apiList<Deliverable>(`/api/v1/projects/${slug}/deliverables/`),
    apiList<ProjectNote>(`/api/v1/projects/${slug}/notes/`),
  ]);

  if (!project) notFound();

  const allDeliverables = deliverables.length > 0 ? deliverables : (project.deliverables ?? []);
  const allNotes = notes.length > 0 ? notes : (project.notes ?? []);
  const subprojects = project.subprojects ?? [];

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--brand-muted)]">
        <Link href="/dashboard/projects" className="hover:text-[var(--brand-primary)]">
          Projects
        </Link>
        {project.client_slug && (
          <>
            <span>/</span>
            <Link
              href={`/dashboard/clients/${project.client_slug}`}
              className="hover:text-[var(--brand-primary)]"
            >
              {project.client_name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[var(--brand-foreground)]">{project.name}</span>
      </nav>

      {/* Project header */}
      <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
                {project.name}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            {project.description && (
              <p className="mt-3 max-w-2xl text-[var(--brand-muted)]">
                {project.description}
              </p>
            )}
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {project.client_name && (
                <div>
                  <dt className="inline text-[var(--brand-muted)]">Client: </dt>
                  <dd className="inline font-medium text-[var(--brand-foreground)]">
                    {project.client_slug ? (
                      <Link
                        href={`/dashboard/clients/${project.client_slug}`}
                        className="hover:text-[var(--brand-primary)]"
                      >
                        {project.client_name}
                      </Link>
                    ) : (
                      project.client_name
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="inline text-[var(--brand-muted)]">Created: </dt>
                <dd className="inline text-[var(--brand-foreground)]">
                  {formatDate(project.created_at)}
                </dd>
              </div>
              <div>
                <dt className="inline text-[var(--brand-muted)]">Updated: </dt>
                <dd className="inline text-[var(--brand-foreground)]">
                  {formatDate(project.updated_at)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Mini stats */}
          <div className="flex gap-3">
            <div className="rounded-2xl bg-[var(--brand-surface-strong)] px-4 py-3 text-center">
              <p className="text-2xl font-semibold tabular-nums text-[var(--brand-foreground)]">
                {allDeliverables.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--brand-muted)]">Deliverables</p>
            </div>
            {subprojects.length > 0 && (
              <div className="rounded-2xl bg-[var(--brand-surface-strong)] px-4 py-3 text-center">
                <p className="text-2xl font-semibold tabular-nums text-[var(--brand-foreground)]">
                  {subprojects.length}
                </p>
                <p className="mt-0.5 text-xs text-[var(--brand-muted)]">Subprojects</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deliverables */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">Deliverables</h2>
        {allDeliverables.length === 0 ? (
          <EmptyState
            title="No deliverables"
            message="Deliverables for this project will appear here once added."
          />
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Due</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {allDeliverables.map((d) => (
                    <tr key={d.id} className="hover:bg-[var(--brand-surface-strong)]/50">
                      <td className="px-6 py-4 font-medium text-[var(--brand-foreground)]">
                        {d.title}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[var(--brand-muted)]">
                        {d.due_date ? formatDate(d.due_date) : "—"}
                      </td>
                      <td className="px-6 py-4 text-[var(--brand-muted)]">
                        <span className="line-clamp-2">{d.notes ?? "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Subprojects */}
      {subprojects.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">Subprojects</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subprojects.map((sub) => (
              <Link
                key={sub.id}
                href={`/dashboard/projects/${sub.slug}`}
                className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] p-4 transition hover:border-[var(--brand-primary)]/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-[var(--brand-foreground)]">{sub.name}</p>
                  <StatusBadge status={sub.status} />
                </div>
                {sub.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--brand-muted)]">
                    {sub.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">Notes</h2>
        {allNotes.length === 0 ? (
          <EmptyState title="No notes" message="Project notes will appear here." />
        ) : (
          <div className="space-y-3">
            {allNotes.map((note) => (
              <article
                key={note.id}
                className="rounded-3xl border border-black/5 bg-[var(--brand-surface)] p-6"
              >
                <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--brand-foreground)]">
                  {note.content}
                </p>
                <div className="mt-4 flex items-center gap-3 text-xs text-[var(--brand-muted)]">
                  {note.author_name && (
                    <>
                      <span className="font-medium">{note.author_name}</span>
                      <span>·</span>
                    </>
                  )}
                  <time>{formatDateLong(note.created_at)}</time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Team */}
      {(project.memberships ?? []).length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">Team</h2>
          <div className="flex flex-wrap gap-2">
            {project.memberships!.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-2xl border border-black/5 bg-[var(--brand-surface)] px-3 py-2"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-white">
                  {(m.user_name ?? m.user_email ?? "?")[0].toUpperCase()}
                </div>
                <span className="text-sm text-[var(--brand-foreground)]">
                  {m.user_name ?? m.user_email ?? m.user}
                </span>
                {m.role && (
                  <span className="text-xs text-[var(--brand-muted)]">{m.role}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
