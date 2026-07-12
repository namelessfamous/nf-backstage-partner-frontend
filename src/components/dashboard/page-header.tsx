import type { ReactNode } from "react";
import type { ScopeValue } from "@/lib/scope";

/**
 * Shared dashboard page header (Task 2).
 *
 * Renders a large page title with a differently-styled subtitle underneath.
 * The subtitle is intended to carry the active scope context (e.g. the partner
 * or client currently in view) in a lighter, uppercase-tracked treatment so it
 * reads as metadata rather than a second heading.
 *
 * Pass `scope` to auto-render a scope chip, or `subtitle` for custom text.
 * `actions` renders on the right (search, buttons, etc.).
 */
export function PageHeader({
  title,
  subtitle,
  scope,
  count,
  countNoun,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  scope?: ScopeValue;
  /** Optional record count shown as a lead-in on the subtitle line. */
  count?: number;
  /** Singular noun for the count (pluralized with a trailing "s"). */
  countNoun?: string;
  actions?: ReactNode;
}) {
  const scopeText = scopeSubtitle(scope);
  const countText =
    count != null && countNoun
      ? `${count} ${countNoun}${count === 1 ? "" : "s"}`
      : null;

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-foreground)] sm:text-4xl">
          {title}
        </h1>
        {(subtitle || scopeText || countText) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase tracking-wider text-[var(--brand-muted)]">
            {scopeText && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-surface-strong)] px-2.5 py-0.5 normal-case tracking-normal text-[var(--brand-primary)]">
                {scopeText.kind}
                <span className="font-semibold">{scopeText.name}</span>
              </span>
            )}
            {countText && <span>{countText}</span>}
            {(scopeText || countText) && subtitle && (
              <span aria-hidden className="text-[var(--brand-muted)]/50">
                ·
              </span>
            )}
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}

function scopeSubtitle(
  scope?: ScopeValue,
): { kind: string; name: string } | null {
  if (!scope) return null;
  if (scope.type === "partner") return { kind: "Partner", name: scope.name };
  if (scope.type === "client") return { kind: "Client", name: scope.name };
  return null;
}
