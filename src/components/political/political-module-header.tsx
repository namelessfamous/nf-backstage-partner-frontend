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
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-[var(--brand-muted)]">
        Political
      </p>
      <h1 className="mt-0.5 text-3xl font-semibold text-[var(--brand-foreground)] sm:text-4xl">
        {title}
      </h1>
      {clientSubtitle && (
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
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
