export function StatsCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <article className="rounded-3xl bg-[var(--brand-surface-strong)] p-5">
      <p className="text-sm font-medium text-[var(--brand-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-[var(--brand-foreground)]">
        {value}
      </p>
      {sub && <p className="mt-2 text-sm text-[var(--brand-muted)]">{sub}</p>}
    </article>
  );
}
