import { apiGet } from "@/lib/api";
import type { ProposalDetail, ProposalVersion } from "@/types/api";
import { renderPdfDocument, esc, money, qty } from "@/lib/pdf";

/**
 * GET /dashboard/proposals/[id]/pdf?version=<versionId>
 *
 * Renders a clean, brand-styled, print-to-PDF document for a proposal. If a
 * `version` query param is supplied it renders that version; otherwise it uses
 * the approved version (falling back to the first). Returns self-contained HTML
 * that auto-opens the browser print dialog → Save as PDF.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const versionParam = url.searchParams.get("version");

  const proposal = await apiGet<ProposalDetail>(`/api/v1/proposals/${id}/`, {
    revalidate: 0,
  });

  if (!proposal) {
    return new Response("Proposal not found", { status: 404 });
  }

  const versions = [...proposal.versions].sort((a, b) => a.order - b.order);
  const active =
    (versionParam && versions.find((v) => v.id === versionParam)) ||
    versions.find((v) => v.is_approved) ||
    versions[0];

  const who = proposal.client_name || proposal.lead_name?.trim() || "";
  const subtitleBits = [who, active ? `Version: ${active.name}` : null].filter(
    Boolean,
  );

  const bodyHtml = active
    ? renderVersion(active)
    : `<p class="muted">This proposal has no versions yet.</p>`;

  const html = renderPdfDocument({
    title: proposal.name,
    subtitle: subtitleBits.join(" · "),
    bodyHtml,
  });

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function renderVersion(version: ProposalVersion): string {
  const sections = [...version.sections].sort((a, b) => a.order - b.order);

  if (sections.length === 0) {
    return `<p class="muted">This version has no sections yet.</p>`;
  }

  const sectionsHtml = sections
    .map((section) => {
      const items = [...section.line_items].sort((a, b) => a.order - b.order);
      const rows =
        items.length === 0
          ? `<tr><td colspan="5" class="muted">No line items.</td></tr>`
          : items
              .map(
                (item) => `<tr>
                  <td>${esc(item.description)}${
                    item.notes
                      ? `<div class="muted" style="font-size:11px;margin-top:2px">${esc(item.notes)}</div>`
                      : ""
                  }</td>
                  <td class="num">${esc(qty(item.quantity))}</td>
                  <td>${esc(item.unit || "—")}</td>
                  <td class="num">${esc(money(item.unit_cost))}</td>
                  <td class="num">${esc(money(item.total))}</td>
                </tr>`,
              )
              .join("");

      return `<div class="section">
        <div class="section-head">
          <span>${esc(section.name)}</span>
          <span>${esc(money(section.subtotal))}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="num">Qty</th>
              <th>Unit</th>
              <th class="num">Unit Cost</th>
              <th class="num">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  const total = `<div class="grand-total">
    <span class="label">${esc(version.name)} total${
      version.is_approved ? " · Approved" : ""
    }</span>
    <span class="amount">${esc(money(version.total))}</span>
  </div>`;

  return sectionsHtml + total;
}
