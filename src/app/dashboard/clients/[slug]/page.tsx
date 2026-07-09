import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, apiList } from "@/lib/api";
import type { ClientDetail, Project } from "@/types/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [client, allProjects] = await Promise.all([
    apiGet<ClientDetail>(`/api/v1/clients/${slug}/`),
    apiList<Project>(`/api/v1/projects/?client_slug=${slug}`),
  ]);

  if (!client) notFound();

  // Merge projects from detail or from explicit list call
  const projects = allProjects.length > 0 ? allProjects : (client.projects ?? []);

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--brand-muted)]">
        <Link href="/dashboard/clients" className="hover:text-[var(--brand-primary)]">
          Clients
        </Link>
        <span>/</span>
        <span className="text-[var(--brand-foreground)]">{client.name}</span>
      </nav>

      {/* Client header */}
      <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
              {client.name}
            </h1>
            {client.description && (
              <p className="mt-2 max-w-2xl text-[var(--brand-muted)]">
                {client.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-[var(--brand-muted)]">
              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-[var(--brand-primary)]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {client.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              <span>Added {formatDate(client.created_at)}</span>
            </div>
          </div>

          {/* Mini stats */}
          <div className="flex gap-3">
            <div className="rounded-2xl bg-[var(--brand-surface-strong)] px-4 py-3 text-center">
              <p className="text-2xl font-semibold tabular-nums text-[var(--brand-foreground)]">
                {projects.length}
              </p>
              <p className="mt-0.5 text-xs text-[var(--brand-muted)]">Projects</p>
            </div>
            <div className="rounded-2xl bg-[var(--brand-surface-strong)] px-4 py-3 text-center">
              <p className="text-2xl font-semibold tabular-nums text-emerald-600">
                {activeCount}
              </p>
              <p className="mt-0.5 text-xs text-[var(--brand-muted)]">Active</p>
            </div>
            <div className="rounded-2xl bg-[var(--brand-surface-strong)] px-4 py-3 text-center">
              <p className="text-2xl font-semibold tabular-nums text-blue-600">
                {completedCount}
              </p>
              <p className="mt-0.5 text-xs text-[var(--brand-muted)]">Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">Projects</h2>

        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            message="Projects under this client will appear here."
            icon={
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">Updated</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {projects.map((project) => (
                    <tr key={project.id} className="group transition hover:bg-[var(--brand-surface-strong)]/50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/projects/${project.slug}`}
                          className="font-medium text-[var(--brand-foreground)] hover:text-[var(--brand-primary)]"
                        >
                          {project.name}
                        </Link>
                        {project.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--brand-muted)]">
                            {project.description}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={project.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[var(--brand-muted)]">
                        {formatDate(project.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/dashboard/projects/${project.slug}`}
                          className="text-xs font-medium text-[var(--brand-primary)] opacity-0 transition group-hover:opacity-100"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Team members */}
      {(client.members ?? []).length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--brand-foreground)]">Team</h2>
          <div className="flex flex-wrap gap-2">
            {client.members!.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-2xl border border-black/5 bg-[var(--brand-surface)] px-3 py-2"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-semibold text-[var(--brand-on-primary)]">
                  {(member.name ?? member.email)[0].toUpperCase()}
                </div>
                <span className="text-sm text-[var(--brand-foreground)]">
                  {member.name ?? member.email}
                </span>
                <span className="text-xs text-[var(--brand-muted)]">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
