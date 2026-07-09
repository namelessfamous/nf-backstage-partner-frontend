"use client";

import { useState } from "react";
import {
  POLITICAL_VIEWS,
  POLITICAL_VIEW_META,
  type PoliticalView,
  type PoliticalFileRow,
} from "@/lib/political-types";
import { PoliticalListView } from "@/components/political/political-list-view";

export function PoliticalTabs({
  grouped,
}: {
  grouped: Record<PoliticalView, PoliticalFileRow[]>;
}) {
  const [active, setActive] = useState<PoliticalView>("walk");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Political views"
        className="flex gap-1 rounded-2xl bg-[var(--brand-surface-strong)] p-1"
      >
        {POLITICAL_VIEWS.map((view) => {
          const meta = POLITICAL_VIEW_META[view];
          const count = grouped[view].length;
          const isActive = view === active;
          return (
            <button
              key={view}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(view)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[var(--brand-surface)] text-[var(--brand-foreground)] shadow-sm"
                  : "text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
              }`}
            >
              {meta.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  isActive
                    ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                    : "bg-black/5 text-[var(--brand-muted)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      {POLITICAL_VIEWS.map((view) =>
        view === active ? (
          <div key={view} role="tabpanel">
            <p className="mb-4 text-sm text-[var(--brand-muted)]">
              {POLITICAL_VIEW_META[view].blurb}
            </p>
            <PoliticalListView
              rows={grouped[view]}
              viewLabel={POLITICAL_VIEW_META[view].label}
              blurb={POLITICAL_VIEW_META[view].blurb}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}
