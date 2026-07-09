"use client";

import { useState } from "react";
import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/theme";

type Props = {
  /** Partner default, used before a stored preference exists. */
  defaultMode: ThemeMode;
};

/**
 * Light/dark switcher. Flips the `data-theme` attribute on <html> (which the
 * root-injected CSS binds every `--brand-*` variable to) and persists the
 * choice to localStorage. The pre-paint init script in the document head does
 * the initial resolve, so this only needs to sync React state on mount.
 */
export function ThemeToggle({ defaultMode }: Props) {
  // Lazy initializer reads the already-resolved data-theme (set pre-paint by
  // themeInitScript) so we never fight the DOM. Falls back to the partner
  // default during SSR where document is unavailable.
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof document === "undefined") return defaultMode;
    return (
      (document.documentElement.getAttribute("data-theme") as ThemeMode | null) ??
      defaultMode
    );
  });

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const isDark = mode === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--brand-muted)] transition hover:bg-[var(--brand-surface-strong)] hover:text-[var(--brand-foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/40"
      // data-theme is resolved pre-paint, but SSR renders the partner default;
      // suppress the one-tick icon mismatch.
      suppressHydrationWarning
    >
      {isDark ? (
        // Sun — indicates clicking goes to light
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="12" cy="12" r="4" />
          <path
            strokeLinecap="round"
            d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
          />
        </svg>
      ) : (
        // Moon — indicates clicking goes to dark
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
          />
        </svg>
      )}
    </button>
  );
}
