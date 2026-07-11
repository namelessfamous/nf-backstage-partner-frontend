import { LoadingStatus } from "@/components/dashboard/loading-status";

/**
 * Instant loading UI for the dashboard route group.
 *
 * Next.js renders this the moment a navigation into /dashboard begins, before
 * any server-side data fetch resolves. It replaces the old behaviour where the
 * "Completing sign-in…" spinner sat frozen on a blank screen while the RSC
 * awaited several API round-trips. The user now sees the branded chrome + a
 * live status line and a skeleton of the real dashboard.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header + rotating status line */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-56 animate-pulse rounded-lg bg-black/5" />
          <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-[var(--brand-accent)] border-t-[var(--brand-primary)]" />
        </div>
        <LoadingStatus />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] p-4"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-black/5" />
            <div className="mt-3 h-8 w-12 animate-pulse rounded bg-black/10" />
          </div>
        ))}
      </div>

      {/* Two-column body skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="mb-3 h-3 w-40 animate-pulse rounded bg-black/5" />
          <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-[var(--brand-surface)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-black/10" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-black/5" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-black/5" />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-3 h-3 w-32 animate-pulse rounded bg-black/5" />
          <ul className="space-y-1 overflow-hidden rounded-2xl border border-black/5 bg-[var(--brand-surface)] p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 px-3 py-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-black/10" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-black/10" />
                  <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-black/5" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
