import { Landmark, Building2 } from "lucide-react";

/**
 * Shared title block for Political submodule pages (mail, call, walk,
 * fundraising). Mirrors the exact eyebrow / title / subtitle pattern used on
 * the Political dashboard index (`/dashboard/political`):
 *
 *   eyebrow   : "Political"
 *   title     : <module>              (e.g. "Direct Mail", "Call")
 *   subtitle  : "Client — <scope>"    (only when a client/partner is in scope)
 *
 * Keeping this in one place guarantees every submodule stays visually
 * consistent with the index page.
 */
export function PoliticalModuleHeader({
  title,
  clientSubtitle,
}: {
  /** Module name — the large heading (e.g. "Direct Mail"). */
  title: string;
  /** Active client/partner scope name; header hides the subtitle when null. */
  clientSubtitle: string | null;
}) {
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--brand-muted)]">
        <Landmark className="h-3 w-3" aria-hidden="true" />
        Political
      </p>
      <h1 className="mt-0.5 text-3xl font-semibold text-[var(--brand-foreground)] sm:text-4xl">
        {title}
      </h1>
      {clientSubtitle && (
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--brand-muted)]">
          <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
          Client — {clientSubtitle}
        </p>
      )}
    </div>
  );
}

/**
 * Derive the "Client — <scope>" subtitle value from a scope context, matching
 * the index page logic: use the active partner/client name when scoped,
 * otherwise fall back to null (no subtitle for the "all" super-admin view).
 */
export function scopeSubtitle(active: {
  type: string;
  name?: string;
}): string | null {
  if ((active.type === "client" || active.type === "partner") && active.name) {
    return active.name;
  }
  return null;
}
