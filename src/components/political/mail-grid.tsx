"use client";

import React, { useState, useCallback, useMemo, useTransition } from "react";
import {
  Mail,
  Package,
  DollarSign,
  Calendar,
  Printer,
  CheckSquare,
  Trash2,
  Plus,
  Receipt,
  Activity,
} from "lucide-react";
import type { BackstageDeliverable } from "@/types/api";
import {
  type MailPieceData,
  type MailPieceStatus,
  MAIL_PIECE_STATUSES,
  parseMailPieceData,
  serializeMailPieceData,
  fmtCurrency,
  fmtNumber,
} from "@/lib/mail-piece";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MailGridRow {
  deliverable: BackstageDeliverable;
  mailPiece: MailPieceData;
}

export interface MailGridGroup {
  projectId: string;
  projectName: string;
  projectStatus: string;
  rows: MailGridRow[];
}

// ── Sorting ────────────────────────────────────────────────────────────────────

/**
 * Canonical row ordering: order label first (natural/alpha-numeric), then drop
 * date. Applied everywhere rows are rendered so the grid is stable regardless of
 * insert order. Rows missing an order label sort after labeled ones; rows
 * missing a drop date sort last within their label group.
 */
function dropDateOf(r: MailGridRow): string {
  return r.deliverable.due_to_client ?? r.deliverable.due_date ?? "";
}

function sortRows(rows: MailGridRow[]): MailGridRow[] {
  return [...rows].sort((a, b) => {
    const la = (a.mailPiece.orderLabel ?? "").trim();
    const lb = (b.mailPiece.orderLabel ?? "").trim();
    // Labeled rows before unlabeled.
    if (la && !lb) return -1;
    if (!la && lb) return 1;
    if (la !== lb) {
      return la.localeCompare(lb, undefined, { numeric: true, sensitivity: "base" });
    }
    // Same (or both empty) label → by drop date; empty dates last.
    const da = dropDateOf(a);
    const db = dropDateOf(b);
    if (da && !db) return -1;
    if (!da && db) return 1;
    return da.localeCompare(db);
  });
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

function formatDropDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Status badge colors (brand-consistent, light theme) ────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-black/5 text-[var(--brand-muted)]",
  DESIGN: "bg-blue-100 text-blue-800",
  APPROVED: "bg-green-100 text-green-800",
  PRINTING: "bg-purple-100 text-purple-800",
  SCHEDULED: "bg-amber-100 text-amber-900",
  DROPPED: "bg-emerald-100 text-emerald-800",
  HOLD: "bg-orange-100 text-orange-900",
  CANCELLED: "bg-red-100 text-red-800",
};

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span className="text-[var(--brand-muted)]">—</span>;
  const cls = STATUS_COLORS[status] ?? "bg-black/5 text-[var(--brand-muted)]";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

// ── Inline-edit cell ──────────────────────────────────────────────────────────

interface EditCellProps {
  value: string;
  display?: string;
  type?: "text" | "number" | "date";
  onSave: (val: string) => void;
  readOnly?: boolean;
  className?: string;
}

function EditCell({ value, display, type = "text", onSave, readOnly, className = "" }: EditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }, [draft, value, onSave]);

  const shown = display ?? value;

  if (readOnly) {
    return <span className={className}>{shown || "—"}</span>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className={`w-full text-left rounded px-1 py-0.5 hover:bg-black/[0.04] transition-colors ${className}`}
      >
        {shown || <span className="text-[var(--brand-muted)]/50">—</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={draft}
      className={`w-full rounded border border-[var(--brand-primary)]/30 bg-[var(--brand-surface)] px-1.5 py-0.5 text-sm text-[var(--brand-foreground)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 ${className}`}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

// ── Select cell ───────────────────────────────────────────────────────────────

interface SelectCellProps {
  value: string;
  options: string[];
  onSave: (val: string) => void;
  readOnly?: boolean;
}

function SelectCell({ value, options, onSave, readOnly }: SelectCellProps) {
  if (readOnly) return <StatusPill status={value} />;
  return (
    <select
      value={value}
      onChange={(e) => onSave(e.target.value)}
      className="w-full rounded border border-[var(--brand-primary)]/20 bg-[var(--brand-surface)] px-1 py-0.5 text-xs text-[var(--brand-foreground)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

// ── Checkbox cell ─────────────────────────────────────────────────────────────

interface CheckCellProps {
  value: boolean;
  onSave: (val: boolean) => void;
  readOnly?: boolean;
}

function CheckCell({ value, onSave, readOnly }: CheckCellProps) {
  if (readOnly) {
    return <span className="text-[var(--brand-foreground)]">{value ? "✓" : "—"}</span>;
  }
  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onSave(e.target.checked)}
      className="h-4 w-4 cursor-pointer accent-[var(--brand-accent)]"
    />
  );
}

// ── Single mail-piece row ─────────────────────────────────────────────────────

interface MailRowProps {
  row: MailGridRow;
  readOnly: boolean;
  onDelete: (id: string) => void;
  onPatch: (id: string, patch: Partial<BackstageDeliverable>) => Promise<void>;
}

function MailRow({ row, readOnly, onDelete, onPatch }: MailRowProps) {
  const { deliverable, mailPiece: mp } = row;
  const [saving, setSaving] = useState(false);

  const patchMail = useCallback(async (patch: Partial<MailPieceData>) => {
    setSaving(true);
    const updated = { ...mp, ...patch };
    const notes_blocks = serializeMailPieceData(deliverable.notes_blocks, updated);
    try {
      await onPatch(deliverable.id, { notes_blocks });
    } finally {
      setSaving(false);
    }
  }, [mp, deliverable, onPatch]);

  const patchDeliverable = useCallback(async (patch: Partial<BackstageDeliverable>) => {
    setSaving(true);
    try {
      await onPatch(deliverable.id, patch);
    } finally {
      setSaving(false);
    }
  }, [deliverable, onPatch]);

  const dropIso = deliverable.due_to_client ?? deliverable.due_date ?? "";

  return (
    <tr className="border-t border-black/5 text-xs text-[var(--brand-foreground)] hover:bg-black/[0.02]">
      {/* # */}
      <td className="px-3 py-2 text-[var(--brand-muted)]">
        <EditCell
          value={mp.pieceNumber?.toString() ?? ""}
          type="number"
          readOnly={readOnly}
          onSave={(v) => patchMail({ pieceNumber: v ? parseInt(v, 10) : undefined })}
          className="w-12 tabular-nums"
        />
      </td>
      {/* Title */}
      <td className="px-3 py-2 font-medium">
        <EditCell
          value={deliverable.name}
          readOnly={readOnly}
          onSave={(v) => patchDeliverable({ name: v })}
          className="min-w-[120px]"
        />
      </td>
      {/* Universe */}
      <td className="px-3 py-2">
        <EditCell
          value={mp.universe ?? ""}
          readOnly={readOnly}
          onSave={(v) => patchMail({ universe: v })}
          className="min-w-[80px]"
        />
      </td>
      {/* Units */}
      <td className="px-3 py-2 tabular-nums text-right">
        <EditCell
          value={mp.units?.toString() ?? ""}
          display={mp.units != null ? fmtNumber(mp.units) : ""}
          type="number"
          readOnly={readOnly}
          onSave={(v) => patchMail({ units: v ? parseInt(v, 10) : undefined })}
          className="w-20 text-right tabular-nums"
        />
      </td>
      {/* Size */}
      <td className="px-3 py-2">
        <EditCell
          value={mp.size ?? ""}
          readOnly={readOnly}
          onSave={(v) => patchMail({ size: v })}
          className="w-24"
        />
      </td>
      {/* Unit Cost */}
      <td className="px-3 py-2 tabular-nums text-right">
        <EditCell
          value={mp.unitCost?.toString() ?? ""}
          display={mp.unitCost != null ? fmtCurrency(mp.unitCost) : ""}
          type="number"
          readOnly={readOnly}
          onSave={(v) => patchMail({ unitCost: v ? parseFloat(v) : undefined })}
          className="w-20 text-right tabular-nums"
        />
      </td>
      {/* Total Cost */}
      <td className="px-3 py-2 tabular-nums text-right">
        <EditCell
          value={mp.totalCost?.toString() ?? ""}
          display={mp.totalCost != null ? fmtCurrency(mp.totalCost) : ""}
          type="number"
          readOnly={readOnly}
          onSave={(v) => patchMail({ totalCost: v ? parseFloat(v) : undefined })}
          className="w-24 text-right tabular-nums"
        />
      </td>
      {/* Drop Date */}
      <td className="px-3 py-2">
        <EditCell
          value={dropIso}
          display={formatDropDate(dropIso)}
          type="date"
          readOnly={readOnly}
          onSave={(v) => patchDeliverable({ due_to_client: v || null })}
          className="w-28"
        />
      </td>
      {/* Designer */}
      <td className="px-3 py-2">
        <EditCell
          value={mp.designer ?? ""}
          readOnly={readOnly}
          onSave={(v) => patchMail({ designer: v })}
          className="w-24"
        />
      </td>
      {/* Mail Status */}
      <td className="px-3 py-2">
        {readOnly ? (
          <StatusPill status={mp.mailStatus} />
        ) : (
          <SelectCell
            value={mp.mailStatus ?? ""}
            options={MAIL_PIECE_STATUSES}
            readOnly={readOnly}
            onSave={(v) => patchMail({ mailStatus: v as MailPieceStatus })}
          />
        )}
      </td>
      {/* Print Status */}
      <td className="px-3 py-2">
        <EditCell
          value={mp.printStatus ?? ""}
          readOnly={readOnly}
          onSave={(v) => patchMail({ printStatus: v })}
          className="w-24"
        />
      </td>
      {/* Invoiced */}
      <td className="px-3 py-2 text-center">
        <CheckCell
          value={mp.invoiced ?? false}
          readOnly={readOnly}
          onSave={(v) => patchMail({ invoiced: v })}
        />
      </td>
      {/* Order Label */}
      <td className="px-3 py-2">
        <EditCell
          value={mp.orderLabel ?? ""}
          readOnly={readOnly}
          onSave={(v) => patchMail({ orderLabel: v })}
          className="w-28"
        />
      </td>
      {/* Delete */}
      {!readOnly && (
        <td className="px-3 py-2 text-center">
          <button
            onClick={() => onDelete(deliverable.id)}
            className="rounded p-1 text-[var(--brand-muted)] hover:bg-red-100 hover:text-red-700 transition-colors"
            title="Delete row"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </td>
      )}
      {/* Saving indicator */}
      {saving && (
        <td className="px-2 py-2">
          <span className="text-[0.6rem] text-[var(--brand-accent)] animate-pulse">saving…</span>
        </td>
      )}
    </tr>
  );
}

// ── Add row form ──────────────────────────────────────────────────────────────

interface AddRowProps {
  projectId: string;
  clientId: string | null | undefined;
  onAdded: (deliverable: BackstageDeliverable) => void;
}

function AddRow({ projectId, clientId: _clientId, onAdded }: AddRowProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const handleAdd = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/deliverables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: projectId,
          name: name.trim(),
          deliverable_type: "mail",
          // Seed the mail_piece notes block so the new deliverable is
          // recognized as a mail piece on reload (isMailPiece checks for it).
          notes_blocks: serializeMailPieceData(undefined, {}),
        }),
      });
      if (res.ok) {
        const d = await res.json() as BackstageDeliverable;
        onAdded(d);
        setName("");
        setOpen(false);
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 rounded-full border border-dashed border-[var(--brand-primary)]/30 px-3 py-1.5 text-xs font-medium text-[var(--brand-primary)] hover:border-[var(--brand-accent)] hover:text-[var(--brand-accent)] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Add Mail Piece
      </button>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Piece title…"
        className="rounded-lg border border-[var(--brand-primary)]/20 bg-[var(--brand-surface)] px-3 py-1.5 text-sm text-[var(--brand-foreground)] outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 placeholder:text-[var(--brand-muted)]/50"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button
        onClick={handleAdd}
        disabled={pending || !name.trim()}
        className="rounded-lg bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-on-primary)] hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Group section ─────────────────────────────────────────────────────────────

interface GroupSectionProps {
  group: MailGridGroup;
  readOnly: boolean;
}

function GroupSection({ group, readOnly }: GroupSectionProps) {
  const [rows, setRows] = useState<MailGridRow[]>(group.rows);
  const sortedRows = useMemo(() => sortRows(rows), [rows]);

  const handlePatch = useCallback(async (
    id: string,
    patch: Partial<BackstageDeliverable>,
  ) => {
    const res = await fetch(`/api/deliverables/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json() as BackstageDeliverable;
      setRows((prev) =>
        prev.map((r) =>
          r.deliverable.id === id
            ? { deliverable: updated, mailPiece: parseMailPieceData(updated.notes_blocks) }
            : r,
        ),
      );
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this mail piece?")) return;
    const res = await fetch(`/api/deliverables/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      setRows((prev) => prev.filter((r) => r.deliverable.id !== id));
    }
  }, []);

  const handleAdded = useCallback((d: BackstageDeliverable) => {
    setRows((prev) => [
      ...prev,
      { deliverable: d, mailPiece: parseMailPieceData(d.notes_blocks) },
    ]);
  }, []);

  const totalCost = rows.reduce((sum, r) => sum + (r.mailPiece.totalCost ?? 0), 0);
  const totalUnits = rows.reduce((sum, r) => sum + (r.mailPiece.units ?? 0), 0);

  const clientId = rows[0]?.deliverable.client_id;

  return (
    <section className="rounded-3xl border border-black/10 bg-[var(--brand-surface)] overflow-hidden shadow-sm">
      {/* Group header */}
      <div className="flex items-center justify-between gap-4 bg-[var(--brand-surface-strong)] px-5 py-3 border-b border-black/5">
        <div>
          <h2 className="inline-flex items-center gap-2 text-sm font-bold text-[var(--brand-foreground)] uppercase tracking-wide">
            <Mail className="h-4 w-4 text-[var(--brand-muted)]" aria-hidden="true" />
            {group.projectName}
          </h2>
          <p className="text-[0.65rem] text-[var(--brand-muted)] mt-0.5 inline-flex items-center gap-1 uppercase tracking-wider">
            <Activity className="h-3 w-3" aria-hidden="true" />
            Election Cycle · {group.projectStatus}
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs text-[var(--brand-muted)]">
          <span className="inline-flex items-center gap-1">
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            {rows.length} {rows.length === 1 ? "piece" : "pieces"}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
            {fmtNumber(totalUnits)} units
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--brand-accent)] tabular-nums">
            <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
            {fmtCurrency(totalCost)}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--brand-surface-strong)]/40 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Universe</th>
              <th className="px-3 py-2 text-right"><span className="inline-flex items-center justify-end gap-1"><Receipt className="h-3 w-3" aria-hidden="true" />Units</span></th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2 text-right"><span className="inline-flex items-center justify-end gap-1"><DollarSign className="h-3 w-3" aria-hidden="true" />Unit Cost</span></th>
              <th className="px-3 py-2 text-right"><span className="inline-flex items-center justify-end gap-1"><DollarSign className="h-3 w-3" aria-hidden="true" />Total Cost</span></th>
              <th className="px-3 py-2"><span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" aria-hidden="true" />Drop Date</span></th>
              <th className="px-3 py-2">Designer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"><span className="inline-flex items-center gap-1"><Printer className="h-3 w-3" aria-hidden="true" />Print Status</span></th>
              <th className="px-3 py-2 text-center"><CheckSquare className="mx-auto h-3 w-3" aria-hidden="true" /></th>
              <th className="px-3 py-2">Order Label</th>
              {!readOnly && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 13 : 14} className="px-5 py-6 text-center text-xs text-[var(--brand-muted)]">
                  No mail pieces yet.
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <MailRow
                  key={row.deliverable.id}
                  row={row}
                  readOnly={readOnly}
                  onDelete={handleDelete}
                  onPatch={handlePatch}
                />
              ))
            )}
          </tbody>
          {/* Cost totals footer */}
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-black/10 bg-[var(--brand-surface-strong)]/50 text-xs font-semibold text-[var(--brand-foreground)]">
                <td className="px-3 py-2" colSpan={3}>Totals</td>
                <td className="px-3 py-2 tabular-nums text-right">{fmtNumber(totalUnits)}</td>
                <td className="px-3 py-2" colSpan={2}></td>
                <td className="px-3 py-2 tabular-nums text-right text-[var(--brand-accent)]">{fmtCurrency(totalCost)}</td>
                <td className="px-3 py-2" colSpan={readOnly ? 6 : 7}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add row */}
      {!readOnly && (
        <div className="px-5 py-3 border-t border-black/5">
          <AddRow
            projectId={group.projectId}
            clientId={clientId}
            onAdded={handleAdded}
          />
        </div>
      )}
    </section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface MailGridProps {
  groups: MailGridGroup[];
  readOnly: boolean;
}

export function MailGrid({ groups, readOnly }: MailGridProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-black/15 bg-[var(--brand-surface)] px-8 py-12 text-center">
        <p className="text-sm text-[var(--brand-muted)]">
          No mail deliverables found for the current scope.
        </p>
        <p className="mt-1 text-xs text-[var(--brand-muted)]/70">
          Create a deliverable with type &quot;mail&quot; and it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <GroupSection key={g.projectId} group={g} readOnly={readOnly} />
      ))}
    </div>
  );
}
