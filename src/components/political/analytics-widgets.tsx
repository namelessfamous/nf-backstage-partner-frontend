import React from "react";
import type { LucideIcon } from "lucide-react";
import type { VoterAnalyticsBar } from "@/lib/political-types";

// ── Palette ─────────────────────────────────────────────────────────────────

export function partyColor(label: string): string {
  const l = label.toLowerCase();
  if (l.startsWith("rep")) return "#d64545";
  if (l.startsWith("dem")) return "#4a7fd6";
  if (l.includes("independent") || l.includes("other")) return "#8a8f98";
  if (l.includes("libertarian")) return "#d4a017";
  if (l.includes("green")) return "#3fa34d";
  return "var(--brand-muted)";
}

export function genderColor(label: string): string {
  const l = label.toLowerCase();
  if (l === "f" || l.startsWith("female")) return "#d67ba8";
  if (l === "m" || l.startsWith("male")) return "#4aa3d6";
  return "var(--brand-muted)";
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

// ── Vertical bar chart (frequency, age histogram, county counts) ──────────────

export function BarChart({
  data,
  colorFn,
  unit = "",
  height = 200,
}: {
  data: VoterAnalyticsBar[];
  colorFn?: (label: string) => string;
  unit?: string;
  height?: number;
}) {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0) || 1;
  if (!data.length) {
    return (
      <p className="py-6 text-center text-xs text-[var(--brand-muted)]">No data</p>
    );
  }
  return (
    <div className="flex items-end gap-1.5 pt-2" style={{ height }}>
      {data.map((d) => {
        const h = Math.max((d.value / max) * (height - 34), 2);
        const color = colorFn ? colorFn(d.label) : "var(--brand-primary)";
        return (
          <div
            key={d.label}
            title={`${d.label}: ${fmt(d.value)}${unit}`}
            className="flex min-w-0 flex-1 flex-col items-center justify-end"
            style={{ height: "100%" }}
          >
            <span className="mb-0.5 whitespace-nowrap text-[0.6rem] text-[var(--brand-muted)]">
              {fmt(d.value)}
            </span>
            <div
              className="w-full max-w-[3rem] rounded-t transition-[height] duration-300"
              style={{ height: h, background: color }}
            />
            <span className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[0.6rem] text-[var(--brand-muted)]">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Horizontal bars with legend (party / gender) ──────────────────────────────

export function HBars({
  data,
  colorFn,
  renderRowAction,
}: {
  data: VoterAnalyticsBar[];
  colorFn: (label: string) => string;
  /** Optional per-row trailing slot (e.g. a segment Filter dropdown). */
  renderRowAction?: (bar: VoterAnalyticsBar) => React.ReactNode;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  if (!data.length) {
    return (
      <p className="py-6 text-center text-xs text-[var(--brand-muted)]">No data</p>
    );
  }
  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {data.map((d) => {
        const pct = (d.value / total) * 100;
        const action = renderRowAction?.(d);
        return (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-[var(--brand-foreground)]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: colorFn(d.label) }}
                />
                {d.label}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[var(--brand-muted)]">
                  <strong className="text-[var(--brand-foreground)]">{fmt(d.value)}</strong>{" "}
                  · {pct.toFixed(1)}%
                </span>
                {action}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--brand-surface-strong)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: colorFn(d.label) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Widget card shell ─────────────────────────────────────────────────────────

export function WidgetCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Optional Lucide icon rendered beside the title. */
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-[var(--brand-surface-strong)] p-5">
      <div className="mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className="h-4 w-4 shrink-0 text-[var(--brand-muted)]"
              aria-hidden="true"
            />
          )}
          <h3 className="text-sm font-semibold text-[var(--brand-foreground)]">{title}</h3>
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
