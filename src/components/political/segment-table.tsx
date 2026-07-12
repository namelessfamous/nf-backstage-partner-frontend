"use client";

/**
 * SegmentTable — live-paginated, filterable, sortable table for a single
 * political segment. Fetches from the same-origin resolve proxy
 * (/api/political/segments/<id>/resolve) on demand; never loads the full
 * dataset into the page.
 *
 * UX/styling mirrors the CsvViewer in file-viewer.tsx (filter input, sortable
 * headers with chevron indicators, RowDrawer for record detail, Prev/Next
 * pagination). Brand tokens (var(--brand-*)), rounded-2xl/3xl, border-black/5.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Search,
  X,
} from "lucide-react";
import type { PoliticalColumn } from "@/lib/political-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortDir = "asc" | "desc";
type RecordData = Record<string, unknown>;

interface ResolveResponse {
  count: number;
  results: RecordData[];
}

export interface SegmentTableProps {
  segmentId: string;
  segmentName: string;
  storeName: string;
  /** View slug ("walk" | "call" | "fundraising") — used for CSV filename. */
  slug: string;
  columns: PoliticalColumn[];
  /** The accurate total count from the initial server fetch. */
  initialCount: number;
  /**
   * Optional per-column pre-filter applied on top of the segment definition,
   * as `{col}:{val}`. Deep-linked from the political analytics widgets (e.g.
   * “this segment, additionally filtered to precinct BOONES CREEK”).
   */
  initialFilter?: { col: string; val: string; label?: string } | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scalarStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

// ---------------------------------------------------------------------------
// RowDrawer — right-side off-canvas panel showing a single record's fields
// ---------------------------------------------------------------------------

function RowDrawer({
  open,
  onClose,
  row,
  columns,
}: {
  open: boolean;
  onClose: () => void;
  row: RecordData | null;
  columns: PoliticalColumn[];
}) {
  const [rendered, setRendered] = useState<RecordData | null>(row);
  useEffect(() => {
    if (row) setRendered(row);
  }, [row]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handle, true);
    return () => window.removeEventListener("keydown", handle, true);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && rendered && (
        <>
          {/* Backdrop */}
          <motion.div
            key="seg-row-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="seg-row-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col overflow-hidden bg-[var(--brand-surface)] shadow-2xl sm:w-[480px] lg:w-[560px] sm:rounded-l-3xl"
            role="dialog"
            aria-modal="true"
            aria-label="Row detail"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/5 px-5 pb-4 pt-5">
              <p className="text-sm font-semibold text-[var(--brand-foreground)]">
                Row detail
              </p>
              <button
                type="button"
                onClick={onClose}
                title="Close"
                className="flex size-8 items-center justify-center rounded-lg border border-black/10 text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="flex flex-col gap-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:opacity-70"
                >
                  <ArrowLeft className="size-4" /> Back to list
                </button>

                {/* Known columns first */}
                <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] divide-y divide-black/5 overflow-hidden">
                  {columns.map((col) => (
                    <div key={col.key} className="flex flex-col gap-0.5 px-4 py-3">
                      <span className="text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wide">
                        {col.label}
                      </span>
                      <span className="text-sm text-[var(--brand-foreground)] break-words">
                        {scalarStr(rendered[col.key]) || "—"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Extra fields not in the column list */}
                {(() => {
                  const knownKeys = new Set(columns.map((c) => c.key));
                  const extra = Object.entries(rendered).filter(
                    ([k]) => !knownKeys.has(k),
                  );
                  if (extra.length === 0) return null;
                  return (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
                        Additional Fields
                      </p>
                      <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] divide-y divide-black/5 overflow-hidden">
                        {extra.map(([k, v]) => (
                          <div key={k} className="flex flex-col gap-0.5 px-4 py-3">
                            <span className="text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wide">
                              {k}
                            </span>
                            <span className="text-sm text-[var(--brand-foreground)] break-words">
                              {scalarStr(v) || "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// SegmentTable
// ---------------------------------------------------------------------------

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function SegmentTable({
  segmentId,
  columns,
  initialCount,
  initialFilter = null,
}: SegmentTableProps) {
  // Additional per-column filter (deep-linked from analytics widgets).
  const [colFilter, setColFilter] = useState(initialFilter);
  // Pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Filter — debounced before sending to API
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sort
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Data
  const [rows, setRows] = useState<RecordData[]>([]);
  const [total, setTotal] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Row drawer
  const [selectedRow, setSelectedRow] = useState<RecordData | null>(null);

  // Fetch from proxy
  const fetchPage = useCallback(
    async (opts: {
      page: number;
      pageSize: number;
      search: string;
      sortCol: string | null;
      sortDir: SortDir;
      colFilter: { col: string; val: string; label?: string } | null;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(opts.pageSize),
          offset: String(opts.page * opts.pageSize),
        });
        if (opts.search) params.set("search", opts.search);
        if (opts.colFilter) {
          params.set("filter", `${opts.colFilter.col}:${opts.colFilter.val}`);
        }
        if (opts.sortCol) {
          params.set("sort", opts.sortCol);
          params.set("dir", opts.sortDir);
        }

        const res = await fetch(
          `/api/political/segments/${encodeURIComponent(segmentId)}/resolve?${params.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
        const data: ResolveResponse = await res.json();
        setRows(data.results ?? []);
        setTotal(data.count ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [segmentId],
  );

  // Fetch on mount and whenever page/pageSize/search/sort/colFilter changes.
  useEffect(() => {
    fetchPage({ page, pageSize, search, sortCol, sortDir, colFilter });
  }, [page, pageSize, search, sortCol, sortDir, colFilter, fetchPage]);

  // Debounce search input
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(0); // reset to first page on new search
    }, 300);
  }

  // Handle column header sort click
  function handleSort(key: string) {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startRow = total === 0 ? 0 : page * pageSize + 1;
  const endRow = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex flex-col gap-3">
      {/* Row Drawer */}
      <RowDrawer
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        row={selectedRow}
        columns={columns}
      />

      {/* Active deep-linked column filter chip */}
      {colFilter && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--brand-foreground)]">
            <span className="text-[var(--brand-muted)]">
              {colFilter.label ?? colFilter.col}:
            </span>
            <span className="font-semibold">{colFilter.val}</span>
            <button
              type="button"
              onClick={() => {
                setColFilter(null);
                setPage(0);
              }}
              aria-label="Remove filter"
              className="ml-0.5 rounded-full px-1 text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)]"
            >
              ×
            </button>
          </span>
        </div>
      )}

      {/* Controls row: filter input + page size */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--brand-muted)]/60 pointer-events-none" />
          <input
            type="text"
            placeholder="Search all columns…"
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full rounded-xl border border-black/10 bg-[var(--brand-surface)] pl-9 pr-3 py-2 text-sm text-[var(--brand-foreground)] placeholder:text-[var(--brand-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <label
            htmlFor="seg-page-size"
            className="text-xs text-[var(--brand-muted)] whitespace-nowrap"
          >
            Rows:
          </label>
          <select
            id="seg-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-lg border border-black/10 bg-[var(--brand-surface)] px-2 py-1.5 text-xs text-[var(--brand-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-[var(--brand-muted)]">
        {loading ? (
          "Loading…"
        ) : error ? (
          <span className="text-red-500">{error}</span>
        ) : total === 0 ? (
          search ? `No rows match "${search}"` : "No rows"
        ) : (
          <>
            Showing{" "}
            <span className="tabular-nums font-medium text-[var(--brand-foreground)]">
              {startRow.toLocaleString()}–{endRow.toLocaleString()}
            </span>{" "}
            of{" "}
            <span className="tabular-nums font-medium text-[var(--brand-foreground)]">
              {total.toLocaleString()}
            </span>
            {search ? ` matching "${search}"` : ""}
          </>
        )}
      </p>

      {/* Table */}
      <div className="max-w-full overflow-x-auto rounded-2xl border border-black/5 bg-[var(--brand-surface)]">
        <table className="w-full min-w-[34rem] text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer select-none px-3 py-2.5 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)] hover:text-[var(--brand-foreground)] sm:px-6 sm:py-3 sm:text-xs"
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    {col.label}
                    {sortCol === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="size-3 shrink-0" />
                      ) : (
                        <ChevronDown className="size-3 shrink-0" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-10 text-center text-sm text-[var(--brand-muted)]"
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-10 text-center text-sm text-[var(--brand-muted)]"
                >
                  {search
                    ? `No rows match "${search}"`
                    : "This segment has no rows yet."}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={i}
                  className={`cursor-pointer transition hover:bg-[var(--brand-surface-strong)]/50 ${
                    loading ? "opacity-50" : ""
                  }`}
                  onClick={() => setSelectedRow(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="max-w-[12rem] truncate px-3 py-3 align-top text-[var(--brand-foreground)] sm:px-6 sm:py-4"
                    >
                      {scalarStr(row[col.key]) || (
                        <span className="text-[var(--brand-muted)]/40">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" /> Prev
          </button>

          <span className="text-xs text-[var(--brand-muted)]">
            Page{" "}
            <span className="font-medium text-[var(--brand-foreground)]">
              {page + 1}
            </span>{" "}
            of {totalPages.toLocaleString()}
          </span>

          <button
            type="button"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 disabled:opacity-30"
          >
            Next <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
