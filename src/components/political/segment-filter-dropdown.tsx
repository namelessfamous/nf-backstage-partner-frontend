import Link from "next/link";
import type { PoliticalListRow, PoliticalView } from "@/lib/political-types";
import { POLITICAL_VIEWS, POLITICAL_VIEW_META } from "@/lib/political-types";

/**
 * A single segment a filter can be applied to, grouped by its view.
 */
export interface FilterableSegment {
  id: string;
  name: string;
  view: PoliticalView;
}

/**
 * Reusable "Filter ›" dropdown for analytics-widget rows.
 *
 * Given a `{ col, val }` (the voter-file column + value that this row
 * represents — e.g. PrecinctName: "BOONES CREEK") and the segments of the
 * scoped voter-file store, it renders links to each segment, deep-linked so
 * the segment view opens *additionally filtered* by this row's value:
 *
 *   /dashboard/political/<view>/<segmentId>?filter=<col>:<val>
 *
 * Pure server component — uses native <details> for the popover, no client JS.
 */
export function SegmentFilterDropdown({
  col,
  val,
  label,
  segments,
  align = "left",
}: {
  col: string | undefined;
  val: string | undefined;
  /** Human label for the filtered column (defaults to `col`). */
  label?: string;
  segments: FilterableSegment[];
  align?: "left" | "right";
}) {
  // No filter target or no segments → nothing to link to.
  if (!col || !val || segments.length === 0) return null;

  const filterParam = `${col}:${val}`;

  // Bucket segments by view, preserving the canonical view order.
  const byView = POLITICAL_VIEWS.map((view) => ({
    view,
    label: POLITICAL_VIEW_META[view].label,
    items: segments.filter((s) => s.view === view),
  })).filter((g) => g.items.length > 0);

  if (byView.length === 0) return null;

  return (
    <details className="group relative inline-block">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full bg-[var(--brand-surface)] px-2.5 py-1 text-[0.7rem] font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)] [&::-webkit-details-marker]:hidden">
        Filter
        <span className="transition group-open:rotate-90">›</span>
      </summary>
      <div
        className={
          "absolute z-30 mt-1 min-w-[11rem] rounded-2xl border border-black/10 bg-[var(--brand-surface)] p-1.5 shadow-lg " +
          (align === "right" ? "right-0" : "left-0")
        }
      >
        <p className="px-2 py-1 text-[0.6rem] uppercase tracking-wide text-[var(--brand-muted)]">
          {(label ?? col)}: <span className="font-semibold">{val}</span>
        </p>
        {byView.map((group) => (
          <div key={group.view} className="py-0.5">
            <p className="px-2 pb-0.5 pt-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--brand-muted)]/70">
              {group.label}
            </p>
            {group.items.map((seg) => (
              <Link
                key={seg.id}
                href={`/dashboard/political/${seg.view}/${seg.id}?filter=${encodeURIComponent(
                  filterParam,
                )}`}
                className="block rounded-lg px-2 py-1.5 text-xs text-[var(--brand-foreground)] transition hover:bg-[var(--brand-primary)]/10"
              >
                {seg.name}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * Flatten the grouped political lists into the minimal segment shape the
 * dropdown needs, restricted to segments backed by a specific store.
 */
export function segmentsForStore(
  grouped: Record<PoliticalView, PoliticalListRow[]>,
  storeId: string,
): FilterableSegment[] {
  const out: FilterableSegment[] = [];
  for (const view of POLITICAL_VIEWS) {
    for (const seg of grouped[view]) {
      if (seg.storeId === storeId) {
        out.push({ id: seg.id, name: seg.name, view });
      }
    }
  }
  return out;
}
