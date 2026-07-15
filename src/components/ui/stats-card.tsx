import type { LucideIcon } from "lucide-react";

export function StatsCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  /** Optional Lucide icon rendered top-right. Backward compatible — omit for current look. */
  icon?: LucideIcon;
}) {
  return (
    <article className="rounded-2xl bg-[var(--brand-surface-strong)] p-3 sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-tight text-[var(--brand-muted)] sm:text-sm">{label}</p>
        {Icon && (
          <Icon
            className="h-4 w-4 shrink-0 text-[var(--brand-muted)] opacity-60"
            aria-hidden="true"
          />
        )}
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--brand-foreground)] sm:mt-3 sm:text-3xl">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[var(--brand-muted)] sm:mt-2 sm:text-sm">{sub}</p>}
    </article>
  );
}
