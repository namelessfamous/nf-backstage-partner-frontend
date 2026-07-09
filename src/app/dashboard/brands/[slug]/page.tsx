import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet } from "@/lib/api";
import type { BrandDetail, BrandColorRole, BrandFont } from "@/types/api";

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
  const stack = `'${font.family}', system-ui, sans-serif`;
  return (
    <div className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-xs font-semibold capitalize text-[var(--brand-primary)]">
          {font.type}
        </span>
        <span className="text-sm font-medium text-[var(--brand-foreground)]">{font.family}</span>
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
  const colorRoles = Object.entries(brand.colors ?? {});

  return (
    <div className="space-y-8">
      {/* Load brand fonts for live specimens */}
      {fontLinks.map((href) => (
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
