import Link from "next/link";
import { apiList } from "@/lib/api";
import { getScopeContext } from "@/lib/scope";
import type { Project, ProjectStatus } from "@/types/api";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

const ALL_STATUSES: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const activeStatus = (status ?? "all") as ProjectStatus | "all";

  // Resolve scope first so we can pass ?client_slug= to the API for client-scope views.
  const scopeCtx = await getScopeContext();
  const { active, activeClientIds, activeClientSlug } = scopeCtx;

  // For client scope: push the filter to the API using client_slug query param
  // (ProjectFilter on the backend has client_slug CharField).
  // For partner/all scope: fetch all projects and filter server-side.
  const apiPath = activeClientSlug
    ? `/api/v1/projects/?client_slug=${encodeURIComponent(activeClientSlug)}`
    : "/api/v1/projects/";

  const allProjects = await apiList<Project>(apiPath, { revalidate: 0 });

  // For partner scope, filter by whether project.client (UUID) is in the
  // partner's client ID list. For client scope the API already filtered;
  // for "all" scope activeClientIds is null so we skip.
  const scopedProjects =
    activeClientIds === null || activeClientSlug !== null
      ? allProjects
      : allProjects.filter(
          (p) => p.client != null && activeClientIds.includes(p.client),
        );

  // Filter by status
  let filtered =
    activeStatus === "all"
      ? scopedProjects
      : scopedProjects.filter((p) => p.status === activeStatus);

  // Filter by search query
  if (q) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.client_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(q.toLowerCase()),
    );
  }

  // Count by status for tab badges
  const countByStatus = ALL_STATUSES.slice(1).reduce<Record<string, number>>(
    (acc, s) => {
      acc[s.value] = scopedProjects.filter((p) => p.status === s.value).length;
      return acc;
    },
    {},
  );

  const scopeLabel =
    active.type === "all"
      ? null
      : active.type === "partner"
        ? `partner: ${active.name}`
        : active.type === "client"
          ? `client: ${active.name}`
          : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">Projects</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          {scopedProjects.length} project{scopedProjects.length !== 1 ? "s" : ""}
          {scopeLabel ? ` · ${scopeLabel}` : " across all clients"}
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map(({ value, label }) => {
          const isActive = activeStatus === value;
          const count =
            value === "all"
              ? scopedProjects.length
              : (countByStatus[value] ?? 0);
          return (
            <Link
              key={value}
              href={
                value === "all"
                  ? "/dashboard/projects"
                  : `/dashboard/projects?status=${value}`
              }
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm"
                  : "bg-[var(--brand-surface-strong)] text-[var(--brand-muted)] hover:bg-[var(--brand-surface-strong)] hover:text-[var(--brand-foreground)]"
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--brand-muted)]/15 text-[var(--brand-muted)]"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form method="get" className="flex gap-3">
        {activeStatus !== "all" && (
          <input type="hidden" name="status" value={activeStatus} />
        )}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search projects…"
          className="w-full max-w-sm rounded-2xl border border-black/10 bg-[var(--brand-surface)] px-4 py-2.5 text-sm text-[var(--brand-foreground)] outline-none placeholder:text-[var(--brand-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
        />
        <button
          type="submit"
          className="rounded-2xl bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90"
        >
          Search
        </button>
        {q && (
          <a
            href={
              activeStatus === "all"
                ? "/dashboard/projects"
                : `/dashboard/projects?status=${activeStatus}`
            }
            className="rounded-2xl border border-black/10 px-4 py-2.5 text-sm text-[var(--brand-muted)] transition hover:border-black/20"
          >
            Clear
          </a>
        )}
      </form>

      {/* Project list */}
      {filtered.length === 0 ? (
        <EmptyState
          title={
            q
              ? `No projects match "${q}"`
              : `No ${activeStatus === "all" ? "" : activeStatus} projects`
          }
          message="Try a different filter or search term."
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />
      ) : (
        <div className="max-w-full rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
                  <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs">Project</th>
                  <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs">Client</th>
                  <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs">Status</th>
                  <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs">Updated</th>
                  <th className="px-3 py-2.5 sm:px-6 sm:py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((project) => (
                  <tr
                    key={project.id}
                    className="group transition hover:bg-[var(--brand-surface-strong)]/50"
                  >
                    <td className="px-3 py-3 align-top sm:px-6 sm:py-4">
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
                    <td className="px-3 py-3 align-top sm:px-6 sm:py-4">
                      {project.client_slug ? (
                        <Link
                          href={`/dashboard/clients/${project.client_slug}`}
                          className="text-[var(--brand-muted)] hover:text-[var(--brand-primary)]"
                        >
                          {project.client_name ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-[var(--brand-muted)]">
                          {project.client_name ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-top sm:px-6 sm:py-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top sm:px-6 sm:py-4 text-[var(--brand-muted)]">
                      {formatDate(project.updated_at)}
                    </td>
                    <td className="px-3 py-3 align-top text-right sm:px-6 sm:py-4">
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
    </div>
  );
}
