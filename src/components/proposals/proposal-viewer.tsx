"use client";

/**
 * ProposalViewer — interactive viewer for a single proposal.
 *
 * Renders a tab per version (ProposalVersion). Each version shows its sections
 * and line items in a costed table, with per-section subtotals and a version
 * grand total. Includes a Print and Export (CSV) toolbar scoped to the active
 * version. Pure presentation — read-only, mirrors the partner-frontend design
 * language (rounded surfaces, brand tokens).
 */

import React, { useMemo, useRef, useState } from "react";
import { FileText, Download, CheckCircle2, ChevronDown } from "lucide-react";
import type { ProposalDetail, ProposalVersion } from "@/types/api";

// ── Formatting helpers ───────────────────────────────────────────────────────

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function money(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return currency.format(Number.isFinite(n) ? n : 0);
}

/** Trim trailing zeros from decimal-string quantities (e.g. "2.0000" → "2"). */
function qty(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(4)));
}

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProposalViewer({ proposal }: { proposal: ProposalDetail }) {
  const versions = useMemo(
    () => [...proposal.versions].sort((a, b) => a.order - b.order),
    [proposal.versions],
  );

  // Default to the approved version if one exists, otherwise the first.
  const initialId =
    versions.find((v) => v.is_approved)?.id ?? versions[0]?.id ?? "";
  const [activeId, setActiveId] = useState(initialId);
  const active = versions.find((v) => v.id === activeId) ?? versions[0];

  const [exportOpen, setExportOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!active) {
    return (
      <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8 text-sm text-[var(--brand-muted)]">
        This proposal has no versions yet.
      </div>
    );
  }

  function openPdf() {
    // Open the server-rendered, print-to-PDF document for the active version.
    window.open(
      `/dashboard/proposals/${proposal.id}/pdf?version=${encodeURIComponent(active.id)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function exportCsv(version: ProposalVersion) {
    const rows: string[] = [];
    rows.push(
      ["Section", "Description", "Qty", "Unit", "Unit Cost", "Total", "Notes"]
        .map(csvCell)
        .join(","),
    );
    for (const section of [...version.sections].sort((a, b) => a.order - b.order)) {
      for (const item of [...section.line_items].sort((a, b) => a.order - b.order)) {
        rows.push(
          [
            section.name,
            item.description,
            qty(item.quantity),
            item.unit || "",
            parseFloat(item.unit_cost || "0").toFixed(2),
            parseFloat(item.total || "0").toFixed(2),
            item.notes || "",
          ]
            .map(csvCell)
            .join(","),
        );
      }
      rows.push(["", `${section.name} subtotal`, "", "", "", parseFloat(section.subtotal || "0").toFixed(2), ""].map(csvCell).join(","));
    }
    rows.push(["", "TOTAL", "", "", "", parseFloat(version.total || "0").toFixed(2), ""].map(csvCell).join(","));

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${proposal.name} — ${version.name}.csv`.replace(/[\\/:*?"<>|]/g, "-");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  return (
    <div className="proposal-viewer space-y-5">
      {/* Toolbar: version tabs + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Version tabs */}
        <div
          className="flex flex-wrap gap-2 proposal-version-tabs"
          role="tablist"
          aria-label="Proposal versions"
        >
          {versions.map((v) => {
            const isActive = v.id === active.id;
            return (
              <button
                key={v.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(v.id)}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)] shadow-sm"
                    : "bg-[var(--brand-surface-strong)] text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
                }`}
              >
                {v.name}
                {v.is_approved && (
                  <CheckCircle2
                    className={`size-3.5 ${isActive ? "text-white" : "text-emerald-600"}`}
                  />
                )}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--brand-muted)]/15 text-[var(--brand-muted)]"
                  }`}
                >
                  {money(v.total)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 proposal-toolbar-actions">
          <button
            onClick={openPdf}
            className="flex items-center gap-1.5 rounded-2xl border border-black/10 bg-[var(--brand-surface)] px-3 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:border-black/20"
          >
            <FileText className="size-4" />
            PDF
          </button>
          <div className="relative">
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-2xl border border-black/10 bg-[var(--brand-surface)] px-3 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:border-black/20"
            >
              <Download className="size-4" />
              Export
              <ChevronDown className="size-3.5" />
            </button>
            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-2xl border border-black/10 bg-[var(--brand-surface)] shadow-lg">
                  <button
                    onClick={() => exportCsv(active)}
                    className="block w-full px-4 py-2.5 text-left text-sm text-[var(--brand-foreground)] transition hover:bg-[var(--brand-surface-strong)]"
                  >
                    Export CSV (this version)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active version body */}
      <div ref={printRef} className="proposal-print-body space-y-6">
        {/* Print-only header */}
        <div className="hidden proposal-print-header">
          <h1 className="text-xl font-bold">{proposal.name}</h1>
          <p className="text-sm">
            {proposal.client_name ?? proposal.lead_name ?? ""} · Version: {active.name}
          </p>
        </div>

        <VersionBody version={active} />
      </div>
    </div>
  );
}

// ── Version body: sections + line items + totals ─────────────────────────────

function VersionBody({ version }: { version: ProposalVersion }) {
  const sections = [...version.sections].sort((a, b) => a.order - b.order);

  if (sections.length === 0) {
    return (
      <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8 text-sm text-[var(--brand-muted)]">
        This version has no sections yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const items = [...section.line_items].sort((a, b) => a.order - b.order);
        return (
          <div
            key={section.id}
            className="max-w-full rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] proposal-section"
          >
            {/* Section header */}
            <div className="flex items-center justify-between gap-4 border-b border-black/5 bg-[var(--brand-surface-strong)] px-6 py-3">
              <h3 className="font-semibold text-[var(--brand-foreground)]">
                {section.name}
              </h3>
              <span className="text-sm font-medium tabular-nums text-[var(--brand-foreground)]">
                {money(section.subtotal)}
              </span>
            </div>

            {/* Line items */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-black/5 text-xs uppercase tracking-wider text-[var(--brand-muted)]">
                    <th className="px-6 py-2.5 text-left font-semibold">Description</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Unit</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Unit Cost</th>
                    <th className="px-6 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-[var(--brand-muted)]">
                        No line items.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            {item.approved && (
                              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                            )}
                            <span className="font-medium text-[var(--brand-foreground)]">
                              {item.description}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                              {item.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--brand-foreground)]">
                          {qty(item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-[var(--brand-muted)]">
                          {item.unit || "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--brand-foreground)]">
                          {money(item.unit_cost)}
                        </td>
                        <td className="px-6 py-3 text-right font-medium tabular-nums text-[var(--brand-foreground)]">
                          {money(item.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Version total */}
      <div className="flex items-center justify-between rounded-[2rem] border border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 px-6 py-4 proposal-version-total">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            {version.name} total
          </span>
          {version.is_approved && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Approved
            </span>
          )}
        </div>
        <span className="text-xl font-bold tabular-nums text-[var(--brand-foreground)]">
          {money(version.total)}
        </span>
      </div>
    </div>
  );
}
