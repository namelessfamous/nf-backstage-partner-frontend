import Link from "next/link";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { apiListCached, emptyOnError, SessionExpiredError } from "@/lib/api";
import { buildReauthUrl } from "@/lib/reauth";
import { getScopeContext } from "@/lib/scope";
import { PageHeader } from "@/components/dashboard/page-header";
import type {
  BackstageDeliverable,
  Project,
  ProposalListItem,
} from "@/types/api";
import { StatsCard } from "@/components/ui/stats-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PoliticalSummary,
  PoliticalSummarySkeleton,
} from "@/components/dashboard/political-summary";

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  // Accept both date-only (YYYY-MM-DD) and full ISO timestamps.
  const d = iso.length <= 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeValue(iso?: string | null): number {
  if (!iso) return 0;
  const d = iso.length <= 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  const t = d.getTime();
  return Number.isNaN(t) ? 0 : t;
}

const DELIVERABLE_STATUS_RANK: Record<string, number> = {
  review: 0,
  in_progress: 1,
  pending: 2,
  approved: 3,
  delivered: 4,
};

type ActivityItem = {
  key: string;
  kind: "deliverable" | "proposal" | "project";
  label: string;
  sub?: string;
  status?: string;
  href: string;
  when: number;
  whenLabel: string | null;
};

async function reauthRedirect(): Promise<never> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "partner.namfam.co";
  const proto = h.get("x-forwarded-proto") ?? "https";
  redirect(buildReauthUrl(`${proto}://${host}`, "/dashboard"));
}

export default async function DashboardPage() {
  let scopeCtx: Awaited<ReturnType<typeof getScopeContext>>;
  try {
    scopeCtx = await getScopeContext();
  } catch (err) {
    if (err instanceof SessionExpiredError) return reauthRedirect();
    throw err;
  }
  const { activeClientIds, active } = scopeCtx;

  // Build a scoped deliverables URL (backend filters server-side; we also
  // belt-and-suspenders filter below).
  let deliverablesPath = "/api/v1/deliverables/";
  if (active.type === "partner") {
    deliverablesPath += `?partner=${encodeURIComponent(active.slug)}`;
  } else if (active.type === "client") {
    deliverablesPath += `?client=${encodeURIComponent(active.slug)}`;
  }

  // Fetch the three resource sets in parallel; each degrades to [] on failure
  // (a lapsed session re-throws and redirects rather than painting zeros).
  let allDeliverables: BackstageDeliverable[];
  let allProjects: Project[];
  let allProposals: ProposalListItem[];
  try {
    [allDeliverables, allProjects, allProposals] = await Promise.all([
      apiListCached<BackstageDeliverable>(deliverablesPath).catch(
        emptyOnError<BackstageDeliverable>,
      ),
      apiListCached<Project>("/api/v1/projects/").catch(
        emptyOnError<Project>,
      ),
      apiListCached<ProposalListItem>("/api/v1/proposals/").catch(
        emptyOnError<ProposalListItem>,
      ),
    ]);
  } catch (err) {
    if (err instanceof SessionExpiredError) return reauthRedirect();
    throw err;
  }

  const inScopeClientId = (clientId?: string | null): boolean =>
    activeClientIds === null ||
    (clientId != null && activeClientIds.includes(clientId));

  const deliverables =
    activeClientIds === null
      ? allDeliverables
      : allDeliverables.filter((d) => inScopeClientId(d.client_id));

  const projects = allProjects.filter((p) => inScopeClientId(p.client));

  const proposals =
    activeClientIds === null
      ? allProposals
      : allProposals.filter((p) => p.client != null && inScopeClientId(p.client));

  // ---- Stats -------------------------------------------------------------
  const inFlight = deliverables.filter((d) =>
    ["pending", "in_progress", "review"].includes(d.status),
  ).length;
  const inReview = deliverables.filter((d) => d.status === "review").length;
  const delivered = deliverables.filter((d) =>
    ["approved", "delivered"].includes(d.status),
  ).length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  // ---- Attention list: deliverables awaiting the partner's review --------
  const needsReview = [...deliverables]
    .filter((d) => d.status === "review")
    .sort((a, b) => {
      const aDue = a.due_to_client ?? a.due_date ?? "9999";
      const bDue = b.due_to_client ?? b.due_date ?? "9999";
      return aDue.localeCompare(bDue);
    })
    .slice(0, 5);

  // ---- Recent activity: newest across deliverables/proposals/projects ----
  const activity: ActivityItem[] = [];

  for (const d of deliverables) {
    const when = timeValue(d.updated_at ?? d.created_at);
    activity.push({
      key: `d-${d.id}`,
      kind: "deliverable",
      label: d.name,
      sub: d.project_name ?? d.client_name ?? undefined,
      status: d.status,
      href: `/dashboard/deliverables/${d.id}`,
      when,
      whenLabel: formatDate(d.updated_at ?? d.created_at),
    });
  }
  for (const p of proposals) {
    const when = timeValue(p.created_at);
    activity.push({
      key: `pr-${p.id}`,
      kind: "proposal",
      label: p.name,
      sub: p.client_name ?? p.lead_name ?? undefined,
      status: p.status,
      href: `/dashboard/proposals/${p.id}`,
      when,
      whenLabel: formatDate(p.created_at),
    });
  }
  for (const p of projects) {
    const when = timeValue(p.updated_at ?? p.created_at);
    activity.push({
      key: `pj-${p.id}`,
      kind: "project",
      label: p.name,
      sub: p.client_name ?? undefined,
      status: p.status,
      href: `/dashboard/projects/${p.slug}`,
      when,
      whenLabel: formatDate(p.updated_at ?? p.created_at),
    });
  }

  const recent = activity.sort((a, b) => b.when - a.when).slice(0, 8);

  const KIND_META: Record<
    ActivityItem["kind"],
    { label: string; dot: string }
  > = {
    deliverable: { label: "Deliverable", dot: "bg-[var(--brand-primary)]" },
    proposal: { label: "Proposal", dot: "bg-[var(--brand-accent)]" },
    project: { label: "Project", dot: "bg-[var(--brand-muted)]" },
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        scope={active}
        subtitle="A snapshot of everything we’re producing for you."
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4 lg:grid-cols-4">
        <Link href="/dashboard/deliverables" className="block">
          <StatsCard label="In Flight" value={inFlight} />
        </Link>
        <Link href="/dashboard/deliverables" className="block">
          <StatsCard label="Awaiting Your Review" value={inReview} />
        </Link>
        <Link href="/dashboard/deliverables" className="block">
          <StatsCard
            label="Delivered"
            value={delivered}
            sub={`${deliverables.length} total`}
          />
        </Link>
        <Link href="/dashboard/projects" className="block">
          <StatsCard
            label="Active Projects"
            value={activeProjects}
            sub={`${projects.length} total`}
          />
        </Link>
      </div>

      {/* Master Voter File — streams in behind Suspense so it never blocks the
          core dashboard's first paint. Renders null for non-political scopes. */}
      <Suspense fallback={<PoliticalSummarySkeleton />}>
        <PoliticalSummary />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs your review */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
              Awaiting your review
            </h2>
            <Link
              href="/dashboard/deliverables"
              className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
            >
              View all deliverables →
            </Link>
          </div>

          {needsReview.length === 0 ? (
            <EmptyState
              title="Nothing waiting on you"
              message="When a deliverable is ready for your review, it'll show up here."
            />
          ) : (
            <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-[var(--brand-surface)]">
              {needsReview.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/dashboard/deliverables/${d.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-[var(--brand-surface-strong)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--brand-foreground)]">
                        {d.name}
                      </p>
                      <p className="truncate text-xs text-[var(--brand-muted)]">
                        {[d.project_name, d.client_name]
                          .filter(Boolean)
                          .join(" · ")}
                        {formatDate(d.due_to_client ?? d.due_date)
                          ? ` · due ${formatDate(d.due_to_client ?? d.due_date)}`
                          : ""}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent activity */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
              Recent activity
            </h2>
          </div>

          {recent.length === 0 ? (
            <EmptyState
              title="No activity yet"
              message="Deliverables, proposals, and projects will appear here as they move."
            />
          ) : (
            <ul className="space-y-1 overflow-hidden rounded-2xl border border-black/5 bg-[var(--brand-surface)] p-2">
              {recent.map((a) => (
                <li key={a.key}>
                  <Link
                    href={a.href}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-[var(--brand-surface-strong)]"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_META[a.kind].dot}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--brand-foreground)]">
                        {a.label}
                      </p>
                      <p className="truncate text-xs text-[var(--brand-muted)]">
                        {KIND_META[a.kind].label}
                        {a.sub ? ` · ${a.sub}` : ""}
                        {a.whenLabel ? ` · ${a.whenLabel}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
