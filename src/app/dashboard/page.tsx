import Link from "next/link";
import { apiList } from "@/lib/api";
import type { Partner, Client, Project, ProjectStatus } from "@/types/api";
import { StatsCard } from "@/components/ui/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getPartnerContext } from "@/lib/partner-context";

const STATUS_ORDER: ProjectStatus[] = ["active", "on_hold", "draft", "completed", "archived"];

export default async function DashboardPage() {
  const { partner } = await getPartnerContext();

  const [partners, clients, projects] = await Promise.all([
    apiList<Partner>("/api/v1/partners/"),
    apiList<Client>("/api/v1/clients/"),
    apiList<Project>("/api/v1/projects/"),
  ]);

  const activeProjects = projects.filter((p) => p.status === "active");
  const projectsByStatus = STATUS_ORDER.reduce<Record<string, number>>((acc, status) => {
    acc[status] = projects.filter((p) => p.status === status).length;
    return acc;
  }, {});

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">
          {partner.displayName} — Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          A bird's-eye view of your clients and active projects.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Partners" value={partners.length} />
        <StatsCard label="Clients" value={clients.length} />
        <StatsCard label="Active Projects" value={activeProjects.length} />
        <StatsCard
          label="Total Projects"
          value={projects.length}
          sub={`${projectsByStatus.completed ?? 0} completed`}
        />
      </div>

      {/* Projects by status */}
      {projects.length > 0 && (
        <section className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6">
          <h2 className="mb-4 text-base font-semibold text-[var(--brand-foreground)]">
            Projects by status
          </h2>
          <div className="flex flex-wrap gap-3">
            {STATUS_ORDER.filter((s) => (projectsByStatus[s] ?? 0) > 0).map((status) => (
              <Link
                key={status}
                href={`/dashboard/projects?status=${status}`}
                className="flex items-center gap-2 rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)] px-4 py-2.5 text-sm transition hover:border-[var(--brand-primary)]/30"
              >
                <StatusBadge status={status} />
                <span className="font-semibold tabular-nums text-[var(--brand-foreground)]">
                  {projectsByStatus[status]}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent projects */}
      <section className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--brand-foreground)]">
            Recent projects
          </h2>
          <Link
            href="/dashboard/projects"
            className="text-sm font-medium text-[var(--brand-primary)] hover:opacity-80"
          >
            View all →
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            message="Projects will appear here once they're added to backstage."
          />
        ) : (
          <div className="divide-y divide-black/5">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.slug}`}
                className="flex items-center justify-between gap-4 py-3.5 transition hover:opacity-80"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--brand-foreground)]">
                    {project.name}
                  </p>
                  {project.client_name && (
                    <p className="mt-0.5 truncate text-xs text-[var(--brand-muted)]">
                      {project.client_name}
                    </p>
                  )}
                </div>
                <StatusBadge status={project.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Clients quick links */}
      {clients.length > 0 && (
        <section className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--brand-foreground)]">
              Clients
            </h2>
            <Link
              href="/dashboard/clients"
              className="text-sm font-medium text-[var(--brand-primary)] hover:opacity-80"
            >
              View all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.slice(0, 6).map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.slug}`}
                className="rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)] p-4 transition hover:border-[var(--brand-primary)]/30"
              >
                <p className="font-medium text-[var(--brand-foreground)]">{client.name}</p>
                {client.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--brand-muted)]">
                    {client.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
