"use client";

/**
 * DeliverableFileViewer — type-dispatched off-canvas panel (right-side drawer).
 *
 * Dispatches on mime_type → file extension → meta hints, in that order.
 * Supported viewers:
 *   csv      — paginated/sortable/filterable table + secondary row viewer
 *   image    — fit-to-panel image
 *   dropbox  — iframe embed
 *   youtube  — iframe embed (normalises URLs to /embed/)
 *   url      — copy + open-in-new-tab affordances
 *   pdf      — iframe embed
 *   fallback — iframe attempt + name link
 */

import React, {
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Download,
  ExternalLink,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowLeft,
} from "lucide-react";
import type { DeliverableFile } from "@/types/api";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

// Same-origin-friendly content proxy through the backstage API. R2's public
// domain (r2.namfam.co) does not send CORS headers, so client-side fetches
// (CSV parsing) must go through /media/<id>/content/ which sets ACAO.
function proxyContentUrl(file: DeliverableFile): string | null {
  if (!file.id) return file.url ?? null;
  const base = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");
  return `${base}/api/v1/media/${file.id}/content/`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileViewerProps {
  file: DeliverableFile;
  open: boolean;
  onClose: () => void;
}

type CsvRow = Record<string, string>;

// ---------------------------------------------------------------------------
// Utility: derive viewer kind
// ---------------------------------------------------------------------------

type ViewerKind =
  | "csv"
  | "image"
  | "dropbox"
  | "youtube"
  | "url"
  | "pdf"
  | "fallback";

function ext(name: string): string {
  return (name.split(".").pop() ?? "").toLowerCase();
}

function deriveKind(file: DeliverableFile): ViewerKind {
  const mime = (file.mime_type ?? "").toLowerCase();
  const name = (file.name ?? "").toLowerCase();
  const url = file.url ?? "";

  // CSV
  if (mime === "text/csv" || ext(name) === "csv") return "csv";

  // Image
  const imgExts = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
  if (mime.startsWith("image/") || imgExts.includes(ext(name)))
    return "image";

  // PDF
  if (mime === "application/pdf" || ext(name) === "pdf") return "pdf";

  // Dropbox
  if (url.includes("dropbox.com") || file.meta?.view_template === "dropbox") return "dropbox";

  // YouTube
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";

  // Generic URL with no file
  if (mime === "" && url.startsWith("http") && !file.mime_type) return "url";

  return "fallback";
}

// ---------------------------------------------------------------------------
// Utility: YouTube URL → embed
// ---------------------------------------------------------------------------

function toYouTubeEmbed(url: string): string {
  // youtu.be/ID
  const short = url.match(/youtu\.be\/([^?&]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  // watch?v=ID
  const watch = url.match(/[?&]v=([^&]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  // already embed URL
  if (url.includes("/embed/")) return url;
  return url;
}

// ---------------------------------------------------------------------------
// Utility: Dropbox → embeddable
// ---------------------------------------------------------------------------

function toDropboxEmbed(url: string): string {
  // Replace www.dropbox.com with dl.dropboxusercontent.com isn't reliable;
  // simplest: add raw=1 / dl=0 for preview
  if (!url.includes("dropbox.com")) return url;
  const u = new URL(url);
  u.searchParams.set("raw", "1");
  return u.toString();
}

// ---------------------------------------------------------------------------
// Row viewer templates
// ---------------------------------------------------------------------------

// Fundraising field mapping (case-insensitive column header → display label)
const FUNDRAISING_FIELDS: [RegExp, string][] = [
  [/^(first.?name|firstname)$/i, "First Name"],
  [/^(last.?name|lastname|surname)$/i, "Last Name"],
  [/^(full.?name|name|contact.?name)$/i, "Name"],
  [/^(email|e-mail|email.?address)$/i, "Email"],
  [/^(phone|telephone|mobile|cell|phone.?number)$/i, "Phone"],
  [/^(address|street|mailing.?address|addr)$/i, "Address"],
  [/^(city|town)$/i, "City"],
  [/^(state|province)$/i, "State"],
  [/^(zip|zipcode|postal|postal.?code)$/i, "ZIP"],
  [/^(employer|company|organization|org)$/i, "Employer"],
  [/^(occupation|job.?title|title|position)$/i, "Occupation"],
  [/^(amount|donation|contribution|total)$/i, "Amount"],
  [/^(date|donated.?on|contribution.?date)$/i, "Date"],
];

function matchFundraisingLabel(col: string): string | null {
  for (const [_re, label] of FUNDRAISING_FIELDS) {
    if (_re.test(col.trim())) return label;
  }
  return null;
}

interface RowViewerProps {
  row: CsvRow;
  onBack: () => void;
  template?: string;
}

type RowViewerComponent = FC<RowViewerProps>;

function FundraisingRowViewer({ row, onBack }: RowViewerProps) {
  const mapped: { label: string; value: string }[] = [];
  const remaining: { label: string; value: string }[] = [];

  for (const [col, value] of Object.entries(row)) {
    const label = matchFundraisingLabel(col);
    if (label) {
      mapped.push({ label, value });
    } else {
      remaining.push({ label: col, value });
    }
  }

  // Build a "Contact Card" — name at top, key fields, then extra
  const name =
    mapped.find((f) => f.label === "Name" || f.label === "First Name")?.value ?? "Contact";
  const lastName = mapped.find((f) => f.label === "Last Name")?.value ?? "";
  const displayName =
    name && lastName && name !== lastName ? `${name} ${lastName}` : name;

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:opacity-70"
      >
        <ArrowLeft className="size-4" /> Back to table
      </button>

      <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] p-5">
        <p className="text-lg font-semibold text-[var(--brand-foreground)]">{displayName}</p>
        <p className="text-xs text-[var(--brand-muted)]">Contact Card</p>
      </div>

      <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] divide-y divide-black/5 overflow-hidden">
        {mapped.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wide">
              {label}
            </span>
            <span className="text-sm text-[var(--brand-foreground)] break-words">
              {value || "—"}
            </span>
          </div>
        ))}
      </div>

      {remaining.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            Additional Fields
          </p>
          <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] divide-y divide-black/5 overflow-hidden">
            {remaining.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wide">
                  {label}
                </span>
                <span className="text-sm text-[var(--brand-foreground)] break-words">
                  {value || "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GenericRowViewer({ row, onBack }: RowViewerProps) {
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:opacity-70"
      >
        <ArrowLeft className="size-4" /> Back to table
      </button>

      <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] divide-y divide-black/5 overflow-hidden">
        {Object.entries(row).map(([col, value]) => (
          <div key={col} className="flex flex-col gap-0.5 px-4 py-3">
            <span className="text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wide">
              {col}
            </span>
            <span className="text-sm text-[var(--brand-foreground)] break-words">
              {value || "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Walk-list (voter canvass) row viewer
// ---------------------------------------------------------------------------

function pick(row: CsvRow, ...keys: string[]): string {
  for (const k of keys) {
    // case-insensitive lookup
    const hit = Object.keys(row).find((c) => c.toLowerCase() === k.toLowerCase());
    if (hit && (row[hit] ?? "").trim()) return row[hit].trim();
  }
  return "";
}

function partyTone(party: string): string {
  const p = party.toLowerCase();
  if (p.includes("republican")) return "bg-red-50 text-red-700 border-red-200";
  if (p.includes("democrat")) return "bg-blue-50 text-blue-700 border-blue-200";
  if (p.includes("independent") || p.includes("non")) return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

// Columns already surfaced in the card header/body — hidden from the
// "Additional Fields" dump so we don't duplicate them.
const WALK_LIST_PRIMARY_COLS = new Set(
  [
    "HHName", "FirstName", "MiddleName", "LastName", "SuffixName",
    "PrimaryAddress1", "PrimaryCity", "PrimaryState", "PrimaryZip", "PrimaryZip4",
    "PrimaryPhone", "Gender",
    "CalculatedParty", "OfficialParty", "ObservedParty", "HouseholdParty",
    "OverAllFrequency", "PrecinctName", "PrecinctNumber", "CountyName",
  ].map((c) => c.toLowerCase()),
);

function WalkListRowViewer({ row, onBack }: RowViewerProps) {
  const first = pick(row, "FirstName");
  const middle = pick(row, "MiddleName");
  const last = pick(row, "LastName");
  const suffix = pick(row, "SuffixName");
  const hhName = pick(row, "HHName");
  const displayName =
    [first, middle, last, suffix].filter(Boolean).join(" ") || hhName || "Voter";

  const addr1 = pick(row, "PrimaryAddress1");
  const city = pick(row, "PrimaryCity");
  const state = pick(row, "PrimaryState");
  const zip = pick(row, "PrimaryZip");
  const cityLine = [city, state].filter(Boolean).join(", ");
  const addressLine = [cityLine, zip].filter(Boolean).join(" ");

  const party = pick(row, "CalculatedParty", "OfficialParty", "ObservedParty");
  const gender = pick(row, "Gender");
  const phone = pick(row, "PrimaryPhone");
  const freq = pick(row, "OverAllFrequency");
  const precinct = pick(row, "PrecinctName");
  const precinctNo = pick(row, "PrecinctNumber");
  const county = pick(row, "CountyName");

  const stat: { label: string; value: string }[] = [
    { label: "Gender", value: gender },
    { label: "Turnout Frequency", value: freq },
    { label: "Precinct", value: [precinct, precinctNo].filter(Boolean).join(" · ") },
    { label: "County", value: county },
  ].filter((s) => s.value);

  const remaining = Object.entries(row).filter(
    ([col, value]) => value?.trim() && !WALK_LIST_PRIMARY_COLS.has(col.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:opacity-70"
      >
        <ArrowLeft className="size-4" /> Back to walk list
      </button>

      {/* Header — name + party */}
      <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-[var(--brand-foreground)]">
              {displayName}
            </p>
            <p className="text-xs text-[var(--brand-muted)]">Walk List Contact</p>
          </div>
          {party && (
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${partyTone(party)}`}
            >
              {party}
            </span>
          )}
        </div>

        {(addr1 || addressLine) && (
          <div className="mt-4 text-sm text-[var(--brand-foreground)]">
            {addr1 && <p>{addr1}</p>}
            {addressLine && <p className="text-[var(--brand-muted)]">{addressLine}</p>}
          </div>
        )}

        {phone && (
          <a
            href={`tel:${phone.replace(/[^0-9+]/g, "")}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-primary)] hover:opacity-70"
          >
            {phone}
          </a>
        )}
      </div>

      {/* Voter stats */}
      {stat.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {stat.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-black/5 bg-[var(--brand-surface)] px-4 py-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                {label}
              </p>
              <p className="mt-0.5 text-sm text-[var(--brand-foreground)]">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Everything else */}
      {remaining.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
            Additional Fields
          </p>
          <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] divide-y divide-black/5 overflow-hidden">
            {remaining.map(([col, value]) => (
              <div key={col} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="text-xs font-medium text-[var(--brand-muted)] uppercase tracking-wide">
                  {col}
                </span>
                <span className="text-sm text-[var(--brand-foreground)] break-words">
                  {value || "\u2014"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Template registry — add new templates here.
 * Keys match file.meta?.view_template (case-insensitive).
 */
const ROW_VIEWER_REGISTRY: Record<string, RowViewerComponent> = {
  fundraising: FundraisingRowViewer,
  walk_list: WalkListRowViewer,
};

function getRowViewer(template?: string): RowViewerComponent {
  if (!template) return GenericRowViewer;
  return ROW_VIEWER_REGISTRY[template.toLowerCase()] ?? GenericRowViewer;
}

/**
 * Plain render function (not a component) used inside CsvViewer to avoid
 * the react-hooks/static-components rule that fires when you create a
 * component variable and use it as a JSX tag during render.
 */
function renderRowViewer(props: RowViewerProps): React.ReactElement {
  const Viewer = getRowViewer(props.template);
  return <Viewer {...props} />;
}

// ---------------------------------------------------------------------------
// Off-canvas row drawer
// ---------------------------------------------------------------------------

/**
 * RowDrawer — right-side off-canvas sidebar that displays a single CSV row via
 * the template-selected row viewer (default: vertical table). Overlays the
 * full-page data table rather than replacing it.
 */
function RowDrawer({
  open,
  onClose,
  row,
  template,
}: {
  open: boolean;
  onClose: () => void;
  row: CsvRow | null;
  template?: string;
}) {
  // Keep the last non-null row mounted through the exit animation so the
  // content doesn't blank out as the drawer slides away.
  const [rendered, setRendered] = useState<CsvRow | null>(row);
  useEffect(() => {
    if (row) setRendered(row);
  }, [row]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && rendered && (
        <>
          {/* Backdrop */}
          <motion.div
            key="row-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.div
            key="row-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full flex-col overflow-hidden bg-[var(--brand-surface)] shadow-2xl sm:w-[480px] lg:w-[560px] sm:rounded-l-3xl"
            role="dialog"
            aria-modal="true"
            aria-label="Row detail"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/5 px-5 pb-4 pt-5">
              <p className="text-sm font-semibold text-[var(--brand-foreground)]">Row detail</p>
              <button
                type="button"
                onClick={onClose}
                title="Close"
                className="flex size-8 items-center justify-center rounded-lg border border-black/10 text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-foreground)]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {renderRowViewer({ row: rendered, onBack: onClose, template })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// CSV Viewer
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

function CsvViewer({ file }: { file: DeliverableFile }) {
  const fetchUrl = proxyContentUrl(file);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  // If there's no URL at all, start in error state to avoid a spurious loading flash
  const [loading, setLoading] = useState(Boolean(fetchUrl));
  const [error, setError] = useState<string | null>(
    fetchUrl ? null : "No file URL available.",
  );

  // Table state
  const [filter, setFilter] = useState("");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  // Row detail state
  const [selectedRow, setSelectedRow] = useState<CsvRow | null>(null);

  const template = file.meta?.view_template;

  useEffect(() => {
    if (!fetchUrl) return; // already handled in initial state

    let cancelled = false;

    async function fetchCsv() {
      try {
        const Papa = (await import("papaparse")).default;
        // Fetch via the API proxy to avoid R2 CORS failures.
        const response = await fetch(fetchUrl!);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();

        Papa.parse<CsvRow>(text, {
          header: true,
          skipEmptyLines: true,
          complete(result) {
            if (cancelled) return;
            setColumns(result.meta.fields ?? []);
            setRows(result.data);
            setLoading(false);
          },
          error(err: { message: string }) {
            if (cancelled) return;
            setError(err.message);
            setLoading(false);
          },
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load CSV";
        setError(msg);
        setLoading(false);
      }
    }

    fetchCsv();
    return () => {
      cancelled = true;
    };
  }, [fetchUrl]);

  const filtered = filter
    ? rows.filter((row) =>
        Object.values(row).some((v) =>
          v.toLowerCase().includes(filter.toLowerCase()),
        ),
      )
    : rows;

  const sorted =
    sortCol
      ? [...filtered].sort((a, b) => {
          const av = (a[sortCol] ?? "").toLowerCase();
          const bv = (b[sortCol] ?? "").toLowerCase();
          const cmp = av.localeCompare(bv, undefined, { numeric: true });
          return sortDir === "asc" ? cmp : -cmp;
        })
      : filtered;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(pageClamped * PAGE_SIZE, (pageClamped + 1) * PAGE_SIZE);

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-[var(--brand-muted)]">
        Loading CSV…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Off-canvas row viewer — overlays the table, does not replace it */}
      <RowDrawer
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        row={selectedRow}
        template={template as string | undefined}
      />

      {/* Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--brand-muted)]/60 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter rows…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-xl border border-black/10 bg-[var(--brand-surface)] pl-9 pr-3 py-2 text-sm text-[var(--brand-foreground)] placeholder:text-[var(--brand-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
        />
      </div>

      {/* Summary */}
      <p className="text-xs text-[var(--brand-muted)]">
        {sorted.length.toLocaleString()} row{sorted.length !== 1 ? "s" : ""}
        {filter ? ` matching "${filter}"` : ""}
        {" — "}
        page {pageClamped + 1} of {totalPages}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-[var(--brand-surface)]">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-black/5 bg-[var(--brand-surface-strong)]">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)] cursor-pointer select-none hover:text-[var(--brand-foreground)] whitespace-nowrap"
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortCol === col ? (
                      sortDir === "asc" ? (
                        <ChevronUp className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )
                    ) : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-[var(--brand-muted)]"
                >
                  No rows match your filter.
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => (
                <tr
                  key={i}
                  className="cursor-pointer transition hover:bg-[var(--brand-surface-strong)]/50"
                  onClick={() => setSelectedRow(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col}
                      className="max-w-[12rem] truncate px-4 py-2.5 text-[var(--brand-foreground)]"
                    >
                      {row[col] ?? ""}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={pageClamped === 0}
            onClick={() => setPage(0)}
            className="rounded-lg border border-black/10 p-1.5 text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 disabled:opacity-30"
          >
            <ChevronsLeft className="size-4" />
          </button>
          <button
            type="button"
            disabled={pageClamped === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border border-black/10 p-1.5 text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs text-[var(--brand-muted)]">
            {pageClamped + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pageClamped >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded-lg border border-black/10 p-1.5 text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            disabled={pageClamped >= totalPages - 1}
            onClick={() => setPage(totalPages - 1)}
            className="rounded-lg border border-black/10 p-1.5 text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 disabled:opacity-30"
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Individual viewer bodies
// ---------------------------------------------------------------------------

function ImageViewer({ file }: { file: DeliverableFile }) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)]/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={file.url!}
        alt={file.name}
        className="max-h-full max-w-full object-contain"
        style={{ maxHeight: "calc(100vh - 14rem)" }}
      />
    </div>
  );
}

function PdfViewer({ file }: { file: DeliverableFile }) {
  return (
    <iframe
      src={file.url!}
      title={file.name}
      className="w-full flex-1 rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)]/30"
      style={{ minHeight: "calc(100vh - 14rem)" }}
    />
  );
}

function DropboxViewer({ file }: { file: DeliverableFile }) {
  const embedUrl = toDropboxEmbed(file.url ?? "");
  return (
    <iframe
      src={embedUrl}
      title={file.name}
      className="w-full flex-1 rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)]/30"
      style={{ minHeight: "calc(100vh - 14rem)" }}
      allowFullScreen
    />
  );
}

function YouTubeViewer({ file }: { file: DeliverableFile }) {
  const embedUrl = toYouTubeEmbed(file.url ?? "");
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-black/5">
      <iframe
        src={embedUrl}
        title={file.name}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function UrlViewer({ file }: { file: DeliverableFile }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!file.url) return;
    await navigator.clipboard.writeText(file.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-black/5 bg-[var(--brand-surface)] px-4 py-4">
        <p className="break-all text-sm text-[var(--brand-foreground)]">{file.url}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[var(--brand-surface)] px-4 py-2.5 text-sm font-medium text-[var(--brand-foreground)] transition hover:border-[var(--brand-primary)]/40"
        >
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
          {copied ? "Copied!" : "Copy URL"}
        </button>
        <a
          href={file.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-[var(--brand-surface)] px-4 py-2.5 text-sm font-medium text-[var(--brand-foreground)] transition hover:border-[var(--brand-primary)]/40"
        >
          <ExternalLink className="size-4" />
          Open
        </a>
      </div>
    </div>
  );
}

function FallbackViewer({ file }: { file: DeliverableFile }) {
  return (
    <div className="flex flex-col gap-4">
      {file.url && (
        <iframe
          src={file.url}
          title={file.name}
          className="w-full rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)]/30"
          style={{ minHeight: "calc(100vh - 18rem)" }}
        />
      )}
      {!file.url && (
        <div className="rounded-2xl border border-dashed border-[var(--brand-muted)]/25 bg-[var(--brand-surface)] px-6 py-12 text-center">
          <p className="text-sm text-[var(--brand-muted)]">No preview available for this file.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Viewer body dispatcher
// ---------------------------------------------------------------------------

function ViewerBody({ file }: { file: DeliverableFile }) {
  const kind = deriveKind(file);

  switch (kind) {
    case "csv":
      return <CsvViewer file={file} />;
    case "image":
      return <ImageViewer file={file} />;
    case "pdf":
      return <PdfViewer file={file} />;
    case "dropbox":
      return <DropboxViewer file={file} />;
    case "youtube":
      return <YouTubeViewer file={file} />;
    case "url":
      return <UrlViewer file={file} />;
    default:
      return <FallbackViewer file={file} />;
  }
}

// ---------------------------------------------------------------------------
// Panel header
// ---------------------------------------------------------------------------

function PanelHeader({
  file,
  onClose,
}: {
  file: DeliverableFile;
  onClose: () => void;
}) {
  return (
    <div className="flex shrink-0 items-start gap-3 border-b border-black/5 px-5 pb-4 pt-5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--brand-foreground)]">
          {file.name}
        </p>
        {file.mime_type && (
          <p className="mt-0.5 truncate text-xs text-[var(--brand-muted)]">{file.mime_type}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {file.meta?.allow_download && file.url && (
          <a
            href={file.url}
            download={file.name}
            target="_blank"
            rel="noopener noreferrer"
            title="Download file"
            className="flex size-8 items-center justify-center rounded-lg border border-black/10 text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-primary)]"
          >
            <Download className="size-4" />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          title="Close viewer"
          className="flex size-8 items-center justify-center rounded-lg border border-black/10 text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-foreground)]"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export: DeliverableFileViewer
// ---------------------------------------------------------------------------

export function DeliverableFileViewer({ file, open, onClose }: FileViewerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // CSV (data tables) open as a FULL-PAGE view; everything else uses the
  // right-side drawer. Data tables need the full width for the sortable,
  // filterable grid.
  const fullPage = deriveKind(file) === "csv";

  if (fullPage) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            key="fullpage"
            ref={panelRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col bg-[var(--brand-background,var(--brand-surface))]"
            role="dialog"
            aria-modal="true"
            aria-label={`Viewing: ${file.name}`}
          >
            <PanelHeader file={file} onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
              <div className="mx-auto w-full max-w-[1400px]">
                <ViewerBody file={file} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.div
            key="panel"
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full flex-col sm:w-[640px] lg:w-[720px] bg-[var(--brand-surface)] shadow-2xl sm:rounded-l-3xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={`Viewing: ${file.name}`}
          >
            <PanelHeader file={file} onClose={onClose} />

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ViewerBody file={file} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
