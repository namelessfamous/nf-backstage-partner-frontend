"use client";

import React, { useState, useCallback, useTransition } from "react";
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

// ── Status badge colors ────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-zinc-700 text-zinc-200",
  DESIGN: "bg-blue-900 text-blue-200",
  APPROVED: "bg-green-900 text-green-200",
  PRINTING: "bg-purple-900 text-purple-200",
  SCHEDULED: "bg-amber-900 text-amber-200",
  DROPPED: "bg-emerald-900 text-emerald-200",
  HOLD: "bg-orange-900 text-orange-200",
  CANCELLED: "bg-red-950 text-red-300",
};

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span className="text-zinc-500">—</span>;
  const cls = STATUS_COLORS[status] ?? "bg-zinc-700 text-zinc-200";
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

// ── Inline-edit cell ──────────────────────────────────────────────────────────

interface EditCellProps {
  value: string;
  type?: "text" | "number";
  onSave: (val: string) => void;
  readOnly?: boolean;
  className?: string;
}

function EditCell({ value, type = "text", onSave, readOnly, className = "" }: EditCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }, [draft, value, onSave]);

  if (readOnly) {
    return <span className={className}>{value || "—"}</span>;
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true); }}
        className={`w-full text-left rounded px-1 py-0.5 hover:bg-white/5 transition-colors ${className}`}
      >
        {value || <span className="text-zinc-600">—</span>}
      </button>
    );
  }

  return (
    <input
      autoFocus
      type={type}
      value={draft}
      className={`w-full rounded border border-amber-600/60 bg-zinc-900 px-1.5 py-0.5 text-sm text-zinc-100 outline-none ring-1 ring-amber-600/40 ${className}`}
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
      className="w-full rounded border border-amber-600/40 bg-zinc-900 px-1 py-0.5 text-xs text-zinc-100 outline-none ring-1 ring-amber-600/20"
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
    return <span>{value ? "✓" : "—"}</span>;
  }
  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onSave(e.target.checked)}
      className="h-4 w-4 cursor-pointer accent-amber-500"
    />
  );
}

// ── Single mail-piece row ─────────────────────────────────────────────────────

interface MailRowProps {
  row: MailGridRow;
  readOnly: boolean;
  onDelete: (id: string) => void;
  onPatch: (id: string, patch: Partial<BackstageDeliverable> & { mailPiece?: MailPieceData }) => Promise<void>;
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

  return (
    <tr className="border-t border-zinc-800 text-xs text-zinc-200 hover:bg-white/[0.02]">
      {/* # */}
      <td className="px-3 py-2 text-zinc-500">
        <EditCell
          value={mp.pieceNumber?.toString() ?? ""}
          type="number"
          readOnly={readOnly}
          onSave={(v) => patchMail({ pieceNumber: v ? parseInt(v, 10) : undefined })}
          className="w-12 tabular-nums"
        />
      </td>
      {/* Title */}
      <td className="px-3 py-2 font-medium text-zinc-100">
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
      <td className="px-3 py-2 tabular-nums">
        <EditCell
          value={mp.units?.toString() ?? ""}
          type="number"
          readOnly={readOnly}
          onSave={(v) => patchMail({ units: v ? parseInt(v, 10) : undefined })}
          className="w-20"
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
      <td className="px-3 py-2 tabular-nums">
        <EditCell
          value={mp.unitCost?.toString() ?? ""}
          type="number"
          readOnly={readOnly}
          onSave={(v) => patchMail({ unitCost: v ? parseFloat(v) : undefined })}
          className="w-20"
        />
      </td>
      {/* Total Cost */}
      <td className="px-3 py-2 tabular-nums">
        {readOnly ? (
          <span>{fmtCurrency(mp.totalCost)}</span>
        ) : (
          <EditCell
            value={mp.totalCost?.toString() ?? ""}
            type="number"
            readOnly={readOnly}
            onSave={(v) => patchMail({ totalCost: v ? parseFloat(v) : undefined })}
            className="w-24"
          />
        )}
      </td>
      {/* Drop Date */}
      <td className="px-3 py-2">
        <EditCell
          value={deliverable.due_to_client ?? deliverable.due_date ?? ""}
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
            className="rounded p-1 text-zinc-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
            title="Delete row"
          >
            ✕
          </button>
        </td>
      )}
      {/* Saving indicator */}
      {saving && (
        <td className="px-2 py-2">
          <span className="text-[0.6rem] text-amber-400 animate-pulse">saving…</span>
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
        className="mt-2 flex items-center gap-1.5 rounded-full border border-dashed border-amber-700/50 px-3 py-1.5 text-xs font-medium text-amber-600 hover:border-amber-500 hover:text-amber-400 transition-colors"
      >
        + Add Mail Piece
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
        className="rounded-lg border border-amber-600/40 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 outline-none ring-1 ring-amber-600/20 placeholder:text-zinc-600"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleAdd();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button
        onClick={handleAdd}
        disabled={pending || !name.trim()}
        className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
      >
        {pending ? "Adding…" : "Add"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-500 hover:text-zinc-300"
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

  // Get client_id from first row for new row creation
  const clientId = rows[0]?.deliverable.client_id;

  return (
    <section className="rounded-3xl border border-amber-900/30 bg-zinc-950 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between gap-4 bg-amber-950/30 px-5 py-3 border-b border-amber-900/20">
        <div>
          <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
            {group.projectName}
          </h2>
          <p className="text-[0.65rem] text-zinc-500 mt-0.5 uppercase tracking-wider">
            Election Cycle · {group.projectStatus}
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs text-zinc-400">
          <span>{rows.length} {rows.length === 1 ? "piece" : "pieces"}</span>
          <span className="tabular-nums">{fmtNumber(totalUnits)} units</span>
          <span className="font-semibold text-amber-400 tabular-nums">{fmtCurrency(totalCost)}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-zinc-900 text-left text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Universe</th>
              <th className="px-3 py-2">Units</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Unit Cost</th>
              <th className="px-3 py-2">Total Cost</th>
              <th className="px-3 py-2">Drop Date</th>
              <th className="px-3 py-2">Designer</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Print Status</th>
              <th className="px-3 py-2 text-center">Inv.</th>
              <th className="px-3 py-2">Order Label</th>
              {!readOnly && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 13 : 14} className="px-5 py-6 text-center text-xs text-zinc-600">
                  No mail pieces yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
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
              <tr className="border-t border-amber-900/30 bg-zinc-900/60 text-xs font-semibold text-zinc-300">
                <td className="px-3 py-2" colSpan={3}>Totals</td>
                <td className="px-3 py-2 tabular-nums">{fmtNumber(totalUnits)}</td>
                <td className="px-3 py-2" colSpan={2}></td>
                <td className="px-3 py-2 tabular-nums text-amber-300">{fmtCurrency(totalCost)}</td>
                <td className="px-3 py-2" colSpan={readOnly ? 6 : 7}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add row */}
      {!readOnly && (
        <div className="px-5 py-3 border-t border-zinc-800">
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
      <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950 px-8 py-12 text-center">
        <p className="text-sm text-zinc-500">
          No mail deliverables found for the current scope.
        </p>
        <p className="mt-1 text-xs text-zinc-600">
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
