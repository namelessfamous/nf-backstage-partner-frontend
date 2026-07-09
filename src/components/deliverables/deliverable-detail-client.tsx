"use client";

/**
 * DeliverableDetailClient — all interactive bits for the deliverable detail page.
 * Includes:
 *   - Content export toolbar (Print / .md / .txt / .pdf / .doc)
 *   - File grid with card previews + file viewer drawer
 *   - Add Note (markdown editor + preview)
 *   - Add Attachment (file upload with progress)
 */

import React, { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  FileText,
  Image as ImageIcon,
  File,
  Video,
  Table,
  ChevronDown,
  Plus,
  Paperclip,
  Eye,
  EyeOff,
  Upload,
  X,
} from "lucide-react";
import { DeliverableFileViewer } from "@/components/deliverables/file-viewer";
import type { DeliverableFile, DeliverableNotesBlock } from "@/types/api";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mimeIcon(file: DeliverableFile) {
  const mime = (file.mime_type ?? "").toLowerCase();
  const name = (file.name ?? "").toLowerCase();
  const ext = name.split(".").pop() ?? "";

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return <ImageIcon className="size-6 text-[var(--brand-muted)]" />;
  if (mime === "application/pdf" || ext === "pdf")
    return <FileText className="size-6 text-[var(--brand-muted)]" />;
  if (["doc", "docx"].includes(ext) || mime.includes("word"))
    return <FileText className="size-6 text-[var(--brand-muted)]" />;
  if (ext === "csv" || mime === "text/csv")
    return <Table className="size-6 text-[var(--brand-muted)]" />;
  if (mime.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext))
    return <Video className="size-6 text-[var(--brand-muted)]" />;
  return <File className="size-6 text-[var(--brand-muted)]" />;
}

function isImageFile(file: DeliverableFile): boolean {
  const mime = (file.mime_type ?? "").toLowerCase();
  const ext = (file.name ?? "").split(".").pop()?.toLowerCase() ?? "";
  return mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Content Export Toolbar
// ---------------------------------------------------------------------------

export function ContentExportToolbar({
  contentMd,
  deliverableId,
}: {
  contentMd: string;
  deliverableId: string;
}) {
  const [open, setOpen] = useState(false);

  function openPdf() {
    // Open the server-rendered, print-to-PDF document route in a new tab.
    window.open(
      `/dashboard/deliverables/${deliverableId}/pdf`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpen(false);
  }

  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function stripMarkdown(md: string): string {
    return md
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
      .replace(/\[(.+?)\]\(.*?\)/g, "$1")
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/^>\s+/gm, "")
      .replace(/---+/g, "")
      .trim();
  }

  function exportMd() {
    downloadBlob(contentMd, "deliverable.md", "text/markdown");
    setOpen(false);
  }

  function exportTxt() {
    downloadBlob(stripMarkdown(contentMd), "deliverable.txt", "text/plain");
    setOpen(false);
  }

  function exportDoc() {
    // Generate an HTML blob with Word-compatible mime type
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><title>Deliverable</title></head><body><pre style="font-family:Calibri,sans-serif;font-size:12pt;white-space:pre-wrap;">${stripMarkdown(contentMd)}</pre></body></html>`;
    downloadBlob(html, "deliverable.doc", "application/msword");
    setOpen(false);
  }

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={openPdf}
        title="Open as PDF"
        className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[var(--brand-surface)] px-3 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-foreground)]"
      >
        <FileText className="size-3.5" />
        PDF
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[var(--brand-surface)] px-3 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-foreground)]"
        >
          <Download className="size-3.5" />
          Export
          <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-xl border border-black/10 bg-[var(--brand-surface)] shadow-xl">
              <button
                type="button"
                onClick={exportMd}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--brand-foreground)] hover:bg-[var(--brand-surface-strong)]/50"
              >
                .md
              </button>
              <button
                type="button"
                onClick={exportTxt}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--brand-foreground)] hover:bg-[var(--brand-surface-strong)]/50"
              >
                .txt
              </button>
              <button
                type="button"
                onClick={openPdf}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--brand-foreground)] hover:bg-[var(--brand-surface-strong)]/50"
              >
                .pdf
              </button>
              <button
                type="button"
                onClick={exportDoc}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--brand-foreground)] hover:bg-[var(--brand-surface-strong)]/50"
              >
                .doc (Word)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// File Grid
// ---------------------------------------------------------------------------

export function DeliverableFileGrid({ files }: { files: DeliverableFile[] }) {
  const [viewerFile, setViewerFile] = useState<DeliverableFile | null>(null);

  if (files.length === 0) {
    return (
      <p className="text-sm text-[var(--brand-muted)]">No files attached yet.</p>
    );
  }

  return (
    <>
      {viewerFile && (
        <DeliverableFileViewer
          file={viewerFile}
          open={Boolean(viewerFile)}
          onClose={() => setViewerFile(null)}
        />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {files.map((file) => (
          <button
            key={file.id}
            type="button"
            onClick={() => setViewerFile(file)}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)]/30 text-left transition hover:border-[var(--brand-primary)]/30 hover:bg-[var(--brand-surface-strong)]/60"
          >
            {/* Thumbnail or icon area */}
            <div className="flex h-32 items-center justify-center bg-[var(--brand-surface-strong)]/40">
              {isImageFile(file) && file.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.url}
                  alt={file.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 p-4">
                  {mimeIcon(file)}
                </div>
              )}
            </div>

            {/* Card body */}
            <div className="flex flex-1 flex-col gap-0.5 p-3">
              <p className="line-clamp-2 text-sm font-medium text-[var(--brand-foreground)]">
                {file.name}
              </p>
              {file.mime_type && (
                <p className="truncate text-xs text-[var(--brand-muted)]">{file.mime_type}</p>
              )}
              {file.size != null && (
                <p className="text-xs text-[var(--brand-muted)]">{formatBytes(file.size)}</p>
              )}
            </div>

            {/* Download affordance */}
            {file.meta?.allow_download && file.url && (
              <a
                href={file.url}
                download={file.name}
                target="_blank"
                rel="noopener noreferrer"
                title="Download"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg bg-[var(--brand-surface)]/80 text-[var(--brand-muted)] opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:text-[var(--brand-primary)]"
              >
                <Download className="size-3.5" />
              </a>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Note
// ---------------------------------------------------------------------------

interface AddNoteProps {
  deliverableId: string;
  existingNotes: DeliverableNotesBlock[];
}

export function AddNote({ deliverableId, existingNotes }: AddNoteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePreview() {
    if (!preview) {
      const { marked } = await import("marked");
      setPreviewHtml(await marked(content));
    }
    setPreview((p) => !p);
  }

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const newNote: DeliverableNotesBlock = {
        title: title.trim() || "Note",
        content: content.trim(),
      };
      const notes_blocks = [...existingNotes, newNote];

      const res = await fetch(`/api/deliverables/${deliverableId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes_blocks }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail ?? `HTTP ${res.status}`);
      }

      setTitle("");
      setContent("");
      setPreview(false);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-black/10 px-3 py-1.5 text-xs font-medium text-[var(--brand-muted)] transition hover:border-[var(--brand-primary)]/40 hover:text-[var(--brand-foreground)]"
      >
        <Plus className="size-3.5" />
        Add note
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--brand-surface-strong)]/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--brand-foreground)]">New note</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
        >
          <X className="size-4" />
        </button>
      </div>

      <input
        type="text"
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-2 w-full rounded-xl border border-black/10 bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-foreground)] placeholder:text-[var(--brand-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
      />

      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs text-[var(--brand-muted)]">Markdown supported</p>
        <button
          type="button"
          onClick={handlePreview}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
        >
          {preview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {preview ? (
        <div
          className="dl-prose min-h-[7rem] rounded-xl border border-black/10 bg-[var(--brand-surface)] px-3 py-2 text-sm"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note in Markdown…"
          rows={5}
          className="w-full resize-y rounded-xl border border-black/10 bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-foreground)] placeholder:text-[var(--brand-muted)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 font-mono"
        />
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-[var(--brand-muted)] hover:text-[var(--brand-foreground)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="rounded-xl bg-[var(--brand-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save note"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Attachment
// ---------------------------------------------------------------------------

interface AddAttachmentProps {
  deliverableId: string;
}

export function AddAttachment({ deliverableId }: AddAttachmentProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      setProgress(10);
      setError(null);

      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("name", file.name);
          formData.append("meta", JSON.stringify({}));

          setProgress(30);

          const res = await fetch(`/api/deliverables/${deliverableId}/upload`, {
            method: "POST",
            body: formData,
          });

          setProgress(80);

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.detail ?? err?.error ?? `HTTP ${res.status}`);
          }

          setProgress(100);
        }

        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setTimeout(() => {
          setUploading(false);
          setProgress(0);
        }, 600);
      }
    },
    [deliverableId, router],
  );

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 transition ${
          dragOver
            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
            : "border-black/10 bg-[var(--brand-surface-strong)]/20 hover:border-[var(--brand-primary)]/30"
        }`}
      >
        <Upload className="mb-2 size-8 text-[var(--brand-muted)]/50" />
        <p className="text-sm font-medium text-[var(--brand-foreground)]">
          Drop files here or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[var(--brand-primary)] hover:opacity-80"
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">Any file type</p>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {uploading && (
        <div className="mt-3">
          <div className="flex items-center justify-between gap-2 text-xs text-[var(--brand-muted)]">
            <span className="flex items-center gap-1.5">
              <Paperclip className="size-3.5 animate-pulse" />
              Uploading…
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--brand-surface-strong)]">
            <div
              className="h-full bg-[var(--brand-primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
