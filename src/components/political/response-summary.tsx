"use client";

/**
 * ResponseSummary — fetches and renders the response-summary for a political
 * segment. Shows total responses, records contacted, response rate, breakdown
 * by value/label (with count bars), and breakdown by channel.
 *
 * If the segment has zero responses, renders a clean empty state.
 * Used on the per-list detail page (Change 2).
 */

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types matching the API response shape
// ---------------------------------------------------------------------------

interface ByValue {
  value: string;
  label: string;
  count: number;
}

interface ByChannel {
  channel: string;
  count: number;
}

interface ByKind {
  kind: string;
  count: number;
}

export interface SegmentResponseSummary {
  scope: "segment";
  id: string;
  name: string;
  purpose: string;
  total_responses: number;
  records_contacted: number;
  response_rate: number; // 0.0–1.0
  by_value: ByValue[];
  by_channel: ByChannel[];
  by_kind: ByKind[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function titleize(s: string): string {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MiniBar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--brand-surface-strong)]">
      <div
        className="h-full rounded-full bg-[var(--brand-primary)]/70"
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

function SummaryStatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <article className="rounded-2xl bg-[var(--brand-surface-strong)] p-3 sm:rounded-3xl sm:p-4">
      <p className="text-xs font-medium leading-tight text-[var(--brand-muted)]">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums text-[var(--brand-foreground)]">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[var(--brand-muted)]">{sub}</p>}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ResponseSummary({ segmentId }: { segmentId: string }) {
  const [data, setData] = useState<SegmentResponseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/political/segments/${encodeURIComponent(segmentId)}/response-summary`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Failed to load response summary (${res.status})`);
        const json: SegmentResponseSummary = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [segmentId]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-5">
        <p className="text-xs text-[var(--brand-muted)]">Loading response data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-5">
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.total_responses === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--brand-muted)]/25 bg-[var(--brand-surface)] px-6 py-10 text-center">
        <p className="font-medium text-[var(--brand-foreground)]">No responses tracked yet</p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[var(--brand-muted)]">
          Responses will appear here as your team logs outreach and replies for
          this list.
        </p>
      </div>
    );
  }

  const maxValueCount = Math.max(...data.by_value.map((v) => v.count), 1);
  const maxChannelCount = Math.max(...data.by_channel.map((c) => c.count), 1);

  return (
    <div className="space-y-5">
      {/* Top-level stat cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <SummaryStatCard
          label="Total Responses"
          value={data.total_responses.toLocaleString()}
        />
        <SummaryStatCard
          label="Records Contacted"
          value={data.records_contacted.toLocaleString()}
        />
        <SummaryStatCard
          label="Response Rate"
          value={pct(data.response_rate)}
          sub="of list members"
        />
      </div>

      {/* By value breakdown */}
      {data.by_value.length > 0 && (
        <div className="rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            By Response
          </p>
          <div className="space-y-2.5">
            {data.by_value.map((item) => (
              <div key={item.value} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <p className="truncate text-xs font-medium text-[var(--brand-foreground)]">
                    {item.label || item.value || "—"}
                  </p>
                </div>
                <MiniBar value={item.count} max={maxValueCount} />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--brand-muted)]">
                  {item.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By channel breakdown */}
      {data.by_channel.length > 0 && (
        <div className="rounded-3xl border border-black/5 bg-[var(--brand-surface-strong)]/40 p-4 sm:p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            By Channel
          </p>
          <div className="space-y-2.5">
            {data.by_channel.map((item) => (
              <div key={item.channel} className="flex items-center gap-3">
                <div className="w-32 shrink-0">
                  <p className="truncate text-xs font-medium text-[var(--brand-foreground)]">
                    {titleize(item.channel)}
                  </p>
                </div>
                <MiniBar value={item.count} max={maxChannelCount} />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-[var(--brand-muted)]">
                  {item.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
