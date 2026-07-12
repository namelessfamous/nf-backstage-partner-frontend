import Link from "next/link";
import { apiList } from "@/lib/api";
import { getScopeContext } from "@/lib/scope";
import type { BrandListItem } from "@/types/api";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Small deterministic swatch derived from the brand name — used as a
// placeholder tile when a brand has no logo_url set.
function initialTile(name: string) {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  // Resolve scope so we can restrict brands to the active partner/client.
  const scopeCtx = await getScopeContext();
  const { active, activeClientIds } = scopeCtx;

  const allBrands = await apiList<BrandListItem>("/api/v1/brands/", {
    revalidate: 0,
  });

  // Scope filtering:
  //   - "all" scope (activeClientIds === null): show everything
  //   - partner/client scope: only brands whose client UUID is in scope.
  //     Brands with no client (client === null) are hidden outside "all" scope.
  const scopedBrands =
    activeClientIds === null
      ? allBrands
      : allBrands.filter(
          (b) => b.client != null && activeClientIds.includes(b.client),
        );

  // Search by name / client / tagline
  let filtered = scopedBrands;
  if (q) {
    const needle = q.toLowerCase();
    filtered = scopedBrands.filter(
      (b) =>
        b.name.toLowerCase().includes(needle) ||
        (b.client_name ?? "").toLowerCase().includes(needle) ||
        (b.tagline ?? "").toLowerCase().includes(needle),
    );
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Guides"
        scope={active}
        count={scopedBrands.length}
        countNoun="brand"
        subtitle={active.type === "all" ? "across all clients" : undefined}
      />

      {/* Search */}
      <form method="get" className="flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search brands…"
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
            href="/dashboard/brands"
            className="rounded-2xl border border-black/10 px-4 py-2.5 text-sm text-[var(--brand-muted)] transition hover:border-black/20"
          >
            Clear
          </a>
        )}
      </form>

      {/* Brand grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title={q ? `No brands match "${q}"` : "No brand guides"}
          message="Brand guides in this scope will appear here."
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <Link
              key={b.id}
              href={`/dashboard/brands/${b.slug}`}
              className="group flex flex-col overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] transition hover:border-[var(--brand-primary)]/30 hover:shadow-lg"
            >
              <div className="flex items-center gap-4 p-5">
                {b.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    className="h-14 w-14 shrink-0 rounded-2xl object-contain"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-surface-strong)] text-xl font-bold text-[var(--brand-primary)]">
                    {initialTile(b.name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--brand-foreground)] group-hover:text-[var(--brand-primary)]">
                    {b.name}
                  </p>
                  {b.tagline && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--brand-muted)]">
                      {b.tagline}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between border-t border-black/5 px-5 py-3 text-xs text-[var(--brand-muted)]">
                <span className="truncate">{b.client_name ?? "—"}</span>
                <span className="shrink-0 font-medium text-[var(--brand-primary)] opacity-0 transition group-hover:opacity-100">
                  View guide →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
