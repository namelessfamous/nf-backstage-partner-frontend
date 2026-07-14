import Link from "next/link";

interface ToggleOption {
  value: string;
  label: string;
}

/**
 * Link-based segmented control. Preserves other query params while switching
 * one key. Keeps the political page a pure server component (no client JS).
 */
export function AnalyticsToggle({
  paramKey,
  current,
  options,
  baseParams,
  labelText,
}: {
  paramKey: string;
  current: string;
  options: ToggleOption[];
  baseParams: Record<string, string>;
  labelText: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
        {labelText}
      </span>
      <div className="inline-flex rounded-full bg-[var(--brand-surface-strong)] p-0.5">
        {options.map((opt) => {
          const active = opt.value === current;
          const params = new URLSearchParams({ ...baseParams, [paramKey]: opt.value });
          return (
            <Link
              key={opt.value}
              href={`?${params.toString()}`}
              scroll={false}
              className={
                active
                  ? "rounded-full bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--brand-on-primary,#111111)]"
                  : "rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)]"
              }
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
