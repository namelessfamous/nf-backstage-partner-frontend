"use client";

/**
 * ExportButton — triggers a streaming CSV export for a political segment
 * through the same-origin export proxy. Injecting auth server-side avoids
 * cross-origin download issues.
 */

import { useState } from "react";
import type { PoliticalListRow } from "@/lib/political-types";

export function ExportButton({ segment }: { segment: PoliticalListRow }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleExport() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/political/segments/${encodeURIComponent(segment.id)}/export`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${segment.slug || segment.view}-${segment.count}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90 disabled:opacity-50"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {busy ? "Preparing…" : "Download full CSV"}
      </button>
      {err && <span className="text-[0.65rem] text-red-500">{err}</span>}
    </div>
  );
}
