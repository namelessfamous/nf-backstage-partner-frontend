import Link from "next/link";
import { apiList } from "@/lib/api";
import { getScopeContext } from "@/lib/scope";
import type { Client } from "@/types/api";
import { EmptyState } from "@/components/ui/empty-state";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [scopeCtx, allClients] = await Promise.all([
    getScopeContext(),
    apiList<Client>("/api/v1/clients/", { revalidate: 0 }),
  ]);

  const { active, activeClientIds } = scopeCtx;

  // Apply scope filter.
  // For partner scope: use the pre-resolved activeClientIds list.
  // For client scope: same — activeClientIds = [that one client's id].
  // For "all": no filter.
  const scopedClients =
    activeClientIds === null
      ? allClients
      : allClients.filter((c) => activeClientIds.includes(c.id));

  // Apply text search on top of scope filter.
  const clients = q
    ? scopedClients.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.description ?? "").toLowerCase().includes(q.toLowerCase()),
      )
    : scopedClients;

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--brand-foreground)]">Clients</h1>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            {scopedClients.length} client{scopedClients.length !== 1 ? "s" : ""}
            {scopeLabel ? ` · ${scopeLabel}` : " in your partner workspace"}
          </p>
        </div>
      </div>

      {/* Search — client-side via URL param using a form */}
      <form method="get" className="flex gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search clients…"
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
            href="/dashboard/clients"
            className="rounded-2xl border border-black/10 px-4 py-2.5 text-sm text-[var(--brand-muted)] transition hover:border-black/20"
          >
            Clear
          </a>
        )}
      </form>

      {/* Results */}
      {clients.length === 0 ? (
        <EmptyState
          title={q ? `No clients match "${q}"` : "No clients yet"}
          message={
            q
              ? "Try a different search term."
              : "Clients will appear here once added to backstage."
          }
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
      ) : (
        <div className="max-w-full rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
                  <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs">Name</th>
                  <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs">Description</th>
                  <th className="px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] sm:px-6 sm:py-3 sm:text-xs">Added</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {clients.map((client) => (
                  <tr key={client.id} className="group transition hover:bg-[var(--brand-surface-strong)]/50">
                    <td className="px-3 py-3 align-top sm:px-6 sm:py-4">
                      <Link
                        href={`/dashboard/clients/${client.slug}`}
                        className="font-medium text-[var(--brand-foreground)] hover:text-[var(--brand-primary)]"
                      >
                        {client.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 align-top sm:px-6 sm:py-4 text-[var(--brand-muted)]">
                      <span className="line-clamp-1">{client.description ?? "—"}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top sm:px-6 sm:py-4 text-[var(--brand-muted)]">
                      {formatDate(client.created_at)}
                    </td>
                    <td className="px-3 py-3 align-top text-right sm:px-6 sm:py-4">
                      <Link
                        href={`/dashboard/clients/${client.slug}`}
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
