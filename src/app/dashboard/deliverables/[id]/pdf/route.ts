import { marked } from "marked";
import { apiGet } from "@/lib/api";
import type { BackstageDeliverable } from "@/types/api";
import { renderPdfDocument, esc } from "@/lib/pdf";

/**
 * GET /dashboard/deliverables/[id]/pdf
 *
 * Renders a clean, brand-styled, print-to-PDF document for a deliverable:
 * its markdown content plus any note blocks. Returns self-contained HTML that
 * auto-opens the browser print dialog → Save as PDF.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const deliverable = await apiGet<BackstageDeliverable>(
    `/api/v1/deliverables/${id}/`,
    { revalidate: 0 },
  );

  if (!deliverable) {
    return new Response("Deliverable not found", { status: 404 });
  }

  const contentHtml = deliverable.content_md
    ? await marked(deliverable.content_md)
    : "";

  const noteBlocks = await Promise.all(
    (deliverable.notes_blocks ?? []).map(async (nb) => ({
      title: nb.title ?? "Note",
      html: nb.content ? await marked(nb.content) : "",
    })),
  );

  const parts: string[] = [];
  if (contentHtml) {
    parts.push(`<div class="prose">${contentHtml}</div>`);
  }
  if (noteBlocks.length > 0) {
    parts.push(`<h2>Notes</h2>`);
    for (const n of noteBlocks) {
      parts.push(
        `<div class="note-block"><h3>${esc(n.title)}</h3><div class="prose">${n.html}</div></div>`,
      );
    }
  }
  if (parts.length === 0) {
    parts.push(`<p class="muted">This deliverable has no written content yet.</p>`);
  }

  const subtitleBits = [
    deliverable.client_name,
    deliverable.project_name,
  ].filter(Boolean) as string[];

  const html = renderPdfDocument({
    title: deliverable.name,
    subtitle: subtitleBits.join(" · "),
    bodyHtml: parts.join("\n"),
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
