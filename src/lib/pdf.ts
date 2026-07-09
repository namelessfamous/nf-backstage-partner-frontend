import "server-only";

/**
 * Shared helpers for the server-rendered, print-to-PDF document routes
 * (/dashboard/proposals/[id]/pdf and /dashboard/deliverables/[id]/pdf).
 *
 * These routes return a self-contained, brand-styled HTML document with an
 * auto-open print dialog. The browser's own PDF engine produces the file —
 * no headless Chromium dependency, which keeps it Vercel-serverless friendly.
 */

const NF_ACID = "#c8f53c";
const NF_NOIR = "#0a0a0b";

/** Escape a string for safe interpolation into HTML text/attributes. */
export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function money(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return usd.format(Number.isFinite(n) ? n : 0);
}

export function qty(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(4)));
}

/**
 * Wrap document body HTML in a complete, print-optimized page.
 *
 * @param title      Document <title> + print filename hint.
 * @param subtitle   Small line under the title (client / version / meta).
 * @param bodyHtml   Pre-rendered, escaped inner HTML for the document.
 * @param autoPrint  When true, opens the print dialog on load.
 */
export function renderPdfDocument(opts: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  autoPrint?: boolean;
}): string {
  const { title, subtitle, bodyHtml, autoPrint = true } = opts;

  const printScript = autoPrint
    ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},350);});</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: #fff; color: #111;
    font-family: "DM Sans", "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 13px; line-height: 1.6;
  }
  .doc { max-width: 800px; margin: 0 auto; padding: 32px 28px; }
  .doc-header {
    display: flex; align-items: center; gap: 14px;
    border-bottom: 3px solid ${NF_ACID}; padding-bottom: 16px; margin-bottom: 24px;
  }
  .doc-mark {
    width: 40px; height: 40px; border-radius: 10px; background: ${NF_ACID};
    display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
  }
  .doc-mark svg { width: 26px; height: 26px; }
  .doc-title { font-size: 20px; font-weight: 700; margin: 0; color: ${NF_NOIR}; }
  .doc-subtitle { font-size: 12px; color: #666; margin: 2px 0 0; }
  h2 { font-size: 15px; margin: 22px 0 8px; color: ${NF_NOIR}; }
  h3 { font-size: 13.5px; margin: 16px 0 6px; color: ${NF_NOIR}; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 4px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #eee; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #888; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .section {
    border: 1px solid #e5e5e5; border-radius: 12px; overflow: hidden; margin: 14px 0;
    break-inside: avoid;
  }
  .section-head {
    display: flex; justify-content: space-between; align-items: center;
    background: #f7f7f5; padding: 9px 14px; font-weight: 600;
    border-bottom: 1px solid #eee;
  }
  .section table { margin: 0; }
  .section th, .section td { padding-left: 14px; padding-right: 14px; }
  .subtotal td { font-weight: 600; background: #fafafa; }
  .grand-total {
    display: flex; justify-content: space-between; align-items: center;
    border: 1px solid ${NF_ACID}; background: #fbffe8;
    border-radius: 12px; padding: 14px 16px; margin-top: 16px;
    break-inside: avoid;
  }
  .grand-total .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #666; font-weight: 600; }
  .grand-total .amount { font-size: 18px; font-weight: 700; }
  .prose { line-height: 1.65; }
  .prose h1, .prose h2, .prose h3 { color: ${NF_NOIR}; }
  .prose ul, .prose ol { padding-left: 1.4em; }
  .prose a { color: #000; text-decoration: underline; }
  .prose img { max-width: 100%; }
  .prose blockquote { border-left: 3px solid ${NF_ACID}; padding-left: .9em; color: #555; margin-left: 0; }
  .note-block { border: 1px solid #eee; border-radius: 12px; padding: 12px 16px; margin: 10px 0; break-inside: avoid; }
  .note-block h3 { margin-top: 0; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; color: #888; }
  .doc-footer {
    margin-top: 34px; border-top: 1px solid #eee; padding-top: 12px;
    font-size: 10px; color: #999; line-height: 1.5;
  }
  .muted { color: #888; }
  @media print {
    .doc { padding: 0; max-width: none; }
    a { color: #000 !important; }
  }
</style>
</head>
<body>
  <div class="doc">
    <div class="doc-header">
      <span class="doc-mark">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
          <path fill="${NF_NOIR}" d="M461 252.4H51v35h48.6c-.1 53.3-.4 112-.7 144.6h114c-.8-13.1-.8-78.2-1.7-122.2l-.8-22.3h3.5a460 460 0 0 0 17.2 46.9c18.6 33.8 39.3 71.8 49.9 97.6h132.2q-1.1-72.2-.9-144.5H461zM99.7 217.2h200a577 577 0 0 0-10.3-29c-17-38.9-43-90.4-48.6-108.2h-142c1.2 38.8 1 81 1 137.2m206.7 0h105.8c.1-59.1.6-112.5 1.7-137.2H302c1.3 23.7 2.6 63.4 3 100.6q.4 16.6 1.4 36.6"/>
        </svg>
      </span>
      <div>
        <p class="doc-title">${esc(title)}</p>
        ${subtitle ? `<p class="doc-subtitle">${esc(subtitle)}</p>` : ""}
      </div>
    </div>
    ${bodyHtml}
    <div class="doc-footer">
      Confidential — intended solely for the authorized recipient. Do not copy or
      distribute without written permission. &copy; ${new Date().getFullYear()} Nameless Famous. All rights reserved.
    </div>
  </div>
  ${printScript}
</body>
</html>`;
}
