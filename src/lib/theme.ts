import type { PartnerConfig, ThemePalette } from "@/lib/partners";

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "nf-partner-theme";

/** Map a palette onto the `--brand-*` custom properties used across the app. */
function paletteToVars(p: ThemePalette): string {
  return [
    `--background:${p.background};`,
    `--brand-primary:${p.primary};`,
    `--brand-secondary:${p.secondary};`,
    `--brand-accent:${p.accent};`,
    `--brand-surface:${p.surface};`,
    `--brand-surface-strong:${p.surfaceStrong};`,
    `--brand-foreground:${p.foreground};`,
    `--brand-muted:${p.muted};`,
    `--brand-on-primary:${p.onPrimary};`,
    `--brand-nav-icon:${p.navIcon};`,
  ].join("");
}

/**
 * Build the CSS that binds each theme mode to `html[data-theme="..."]`.
 * Injected once at the document root so switching `data-theme` re-themes the
 * whole portal with zero re-render.
 */
export function buildThemeCss(partner: PartnerConfig): string {
  return (
    `html[data-theme="dark"]{${paletteToVars(partner.theme.dark)}}` +
    `html[data-theme="light"]{${paletteToVars(partner.theme.light)}}`
  );
}

/**
 * Inline script that resolves the active theme before first paint (no FOUC):
 * localStorage override → partner default → attribute on <html>.
 */
export function themeInitScript(defaultMode: ThemeMode): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var m=(s==="light"||s==="dark")?s:${JSON.stringify(
    defaultMode,
  )};document.documentElement.setAttribute("data-theme",m);document.documentElement.style.colorScheme=m;}catch(e){document.documentElement.setAttribute("data-theme",${JSON.stringify(
    defaultMode,
  )});}})();`;
}
