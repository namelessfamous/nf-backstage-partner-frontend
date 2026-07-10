import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api";
import type { BrandDetail, BrandColorRole, BrandFont, BrandLogoPackage } from "@/types/api";

const TONE_KEYS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Collect unique Google Fonts import URLs so we can <link> them and render
// live type specimens in the brand's actual faces.
function googleFontLinks(typography: BrandFont[]): string[] {
  const urls = new Set<string>();
  for (const f of typography) {
    if (f.source === "google" && f.google_import_url) urls.add(f.google_import_url);
  }
  return Array.from(urls);
}

// Collect unique Adobe Typekit kit CSS URLs. Adobe fonts are delivered via a
// project (kit) id -> https://use.typekit.net/<kit>.css, which defines the
// @font-face rules for every family in that kit. Injecting the <link> lets us
// render live specimens in the brand's actual Adobe faces.
function adobeFontLinks(typography: BrandFont[]): string[] {
  const urls = new Set<string>();
  for (const f of typography) {
    if (f.source === "adobe" && f.adobe_project_id) {
      urls.add(`https://use.typekit.net/${f.adobe_project_id}.css`);
    }
  }
  return Array.from(urls);
}

// Normalize a font family value into a clean CSS font-family stack. Stored
// families sometimes arrive already-quoted (e.g. '"bookmania"'); strip stray
// quotes so we don't emit invalid double-quoted names.
function fontStack(family: string, fallback = "system-ui, sans-serif"): string {
  const clean = (family || "").replace(/["']/g, "").trim();
  return clean ? `"${clean}", ${fallback}` : fallback;
}

function ColorRoleCard({ role, data }: { role: string; data: BrandColorRole }) {
  const tones = data.tones ?? {};
  const contrast = data.contrast ?? {};
  const hasScale = Object.keys(tones).length > 0;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]">
      <div className="flex items-center justify-between px-6 py-4">
        <h3 className="text-sm font-semibold capitalize text-[var(--brand-foreground)]">
          {role}
        </h3>
        <code className="rounded-lg bg-[var(--brand-surface-strong)] px-2 py-1 text-xs text-[var(--brand-muted)]">
          {data.base}
        </code>
      </div>

      {hasScale ? (
        <div className="grid grid-cols-11">
          {TONE_KEYS.map((k) => {
            const hex = tones[k];
            if (!hex) return null;
            const fg = contrast[k] ?? "#000000";
            return (
              <div
                key={k}
                className="flex aspect-[3/4] flex-col justify-between p-2 text-[10px] font-medium"
                style={{ background: hex, color: fg }}
                title={`${role}-${k} · ${hex}`}
              >
                <span className="opacity-80">{k}</span>
                <span className="tabular-nums opacity-70">{hex.replace("#", "")}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="flex h-20 items-center justify-center text-xs font-medium"
          style={{ background: data.base }}
        >
          <span className="rounded bg-black/20 px-2 py-1 text-white">{data.base}</span>
        </div>
      )}
    </div>
  );
}

function TypeSpecimen({ font }: { font: BrandFont }) {
  const stack = fontStack(font.family);
  const cleanFamily = (font.family || "").replace(/["']/g, "").trim();
  return (
    <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-xs font-semibold capitalize text-[var(--brand-primary)]">
          {font.type}
        </span>
        <span className="text-sm font-medium text-[var(--brand-foreground)]">{cleanFamily}</span>
        {font.weight && (
          <span className="text-xs text-[var(--brand-muted)]">weight {font.weight}</span>
        )}
        {font.variable && (
          <span className="rounded-full bg-[var(--brand-surface-strong)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
            variable
          </span>
        )}
        {font.source && (
          <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--brand-muted)]">
            {font.source}
          </span>
        )}
      </div>
      <p
        className="text-3xl leading-tight text-[var(--brand-foreground)]"
        style={{ fontFamily: stack, fontWeight: Number(font.weight) || undefined }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
      <p
        className="mt-2 text-sm text-[var(--brand-muted)]"
        style={{ fontFamily: stack }}
      >
        ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
      </p>
    </div>
  );
}

// Preferred display order for format download links. Raster previews first,
// then vector deliverables.
const FORMAT_ORDER = ["png", "jpg", "svg", "pdf", "eps", "ai"];
// Formats we can render as an inline <img> preview thumbnail.
const PREVIEWABLE = new Set(["png", "jpg", "jpeg", "svg"]);

function orderedOutputs(outputs: Record<string, string>): [string, string][] {
  const entries = Object.entries(outputs || {}).filter(([, url]) => !!url);
  return entries.sort((a, b) => {
    const ia = FORMAT_ORDER.indexOf(a[0]);
    const ib = FORMAT_ORDER.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function DownloadIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function LogoPackageAccordion({ pkg }: { pkg: BrandLogoPackage }) {
  const outputs = orderedOutputs(pkg.outputs);
  const previews = outputs.filter(([fmt]) => PREVIEWABLE.has(fmt));
  const isReady = pkg.status === "ready";
  const statusLabel =
    pkg.status === "ready"
      ? `${outputs.length} file${outputs.length === 1 ? "" : "s"}`
      : pkg.status === "error"
        ? "Conversion failed"
        : pkg.status === "processing"
          ? "Processing\u2026"
          : "Pending";

  return (
    <details className="group overflow-hidden rounded-[2rem] border border-black/5 bg-[var(--brand-surface)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-sm font-semibold text-[var(--brand-foreground)]">{pkg.name}</span>
          <span
            className={
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
              (isReady
                ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                : pkg.status === "error"
                  ? "bg-red-500/10 text-red-600"
                  : "bg-[var(--brand-surface-strong)] text-[var(--brand-muted)]")
            }
          >
            {statusLabel}
          </span>
        </div>
        <svg
          className="h-4 w-4 shrink-0 text-[var(--brand-muted)] transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="border-t border-black/5 px-6 py-5">
        {pkg.notes && (
          <p className="mb-4 text-xs text-[var(--brand-muted)]">{pkg.notes}</p>
        )}

        {!isReady ? (
          <p className="text-xs text-[var(--brand-muted)]">
            {pkg.status === "error"
              ? pkg.error || "This package could not be converted."
              : "Deliverables are still being generated. Check back shortly."}
          </p>
        ) : (
          <>
            {previews.length > 0 && (
              <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {previews.map(([fmt, url]) => (
                  <div
                    key={`preview-${fmt}`}
                    className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-black/5 bg-[var(--brand-surface-strong)] p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`${pkg.name} ${fmt.toUpperCase()} preview`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {outputs.map(([fmt, url]) => (
                <a
                  key={`dl-${fmt}`}
                  href={url}
                  download
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-[var(--brand-surface-strong)] px-3 py-1.5 text-xs font-medium text-[var(--brand-foreground)] transition hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]"
                >
                  <DownloadIcon />
                  {fmt.toUpperCase()}
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </details>
  );
}

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const brand = await apiGet<BrandDetail>(
    `/api/v1/brands/by-slug/${encodeURIComponent(slug)}/`,
    { revalidate: 0 },
  );

  if (!brand) notFound();

  const fontLinks = googleFontLinks(brand.typography ?? []);
  const adobeLinks = adobeFontLinks(brand.typography ?? []);
  const colorRoles = Object.entries(brand.colors ?? {});

  return (
    <div className="space-y-8">
      {/* Load brand fonts for live specimens (Google + Adobe Typekit) */}
      {fontLinks.map((href) => (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link key={href} rel="stylesheet" href={href} />
      ))}
      {adobeLinks.map((href) => (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link key={href} rel="stylesheet" href={href} />
      ))}

      {/* Back link */}
      <Link
        href="/dashboard/brands"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-muted)] transition hover:text-[var(--brand-foreground)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Brand Guides
      </Link>

      {/* Hero */}
      <div className="flex flex-col gap-5 rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8 sm:flex-row sm:items-center">
        {brand.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logo_url}
            alt={brand.name}
            className="h-20 w-20 shrink-0 rounded-2xl object-contain"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-surface-strong)] text-3xl font-bold text-[var(--brand-primary)]">
            {(brand.name.trim().charAt(0) || "?").toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold text-[var(--brand-foreground)]">{brand.name}</h1>
          {brand.tagline && (
            <p className="mt-1 text-base text-[var(--brand-muted)]">{brand.tagline}</p>
          )}
          <p className="mt-2 text-xs text-[var(--brand-muted)]">
            {brand.client_name ? `${brand.client_name} · ` : ""}Updated {formatDate(brand.updated_at)}
          </p>
        </div>
      </div>

      {/* Brand voice */}
      {brand.brand_voice && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--brand-foreground)]">Brand Voice</h2>
          <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--brand-foreground)]">
              {brand.brand_voice}
            </p>
          </div>
        </section>
      )}

      {/* Typography */}
      {brand.typography?.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--brand-foreground)]">Typography</h2>
          <div className="grid grid-cols-1 gap-4">
            {brand.typography.map((f, i) => (
              <TypeSpecimen key={`${f.type}-${f.family}-${i}`} font={f} />
            ))}
          </div>
        </section>
      )}

      {/* Logo packages */}
      {(brand.logo_packages?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--brand-foreground)]">Logo Packages</h2>
          <div className="grid grid-cols-1 gap-3">
            {brand.logo_packages!.map((pkg) => (
              <LogoPackageAccordion key={pkg.id} pkg={pkg} />
            ))}
          </div>
        </section>
      )}

      {/* Color system */}
      {colorRoles.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--brand-foreground)]">Color System</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {colorRoles.map(([role, data]) => (
              <ColorRoleCard key={role} role={role} data={data} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
