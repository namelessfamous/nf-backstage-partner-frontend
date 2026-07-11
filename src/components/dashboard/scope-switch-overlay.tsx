"use client";

import { useEffect, useState } from "react";

/**
 * Full-screen loading overlay shown while a scope change is in flight.
 *
 * Rendered by <ScopeSelector /> while its `router.refresh()` transition is
 * pending. It covers the whole viewport with the branded surface, a spinner,
 * the name of the scope being switched to, and a rotating detail line so the
 * user gets rich feedback instead of a dimmed dropdown while the dashboard RSC
 * re-streams.
 */

const DETAILS = [
  "Switching scope…",
  "Loading your data…",
  "Rebuilding your dashboard…",
  "Almost there…",
];

export function ScopeSwitchOverlay({ scopeName }: { scopeName: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setI((n) => Math.min(n + 1, DETAILS.length - 1)),
      900,
    );
    return () => clearInterval(id);
  }, []);

  // Lock body scroll while the overlay is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Switching to ${scopeName}`}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5
        bg-[var(--brand-surface)]/85 backdrop-blur-sm
        animate-[fadeIn_150ms_ease-out]"
    >
      <span
        className="inline-flex h-12 w-12 animate-spin rounded-full border-[3px]
          border-[var(--brand-accent)] border-t-[var(--brand-primary)]"
        aria-hidden
      />
      <div className="max-w-xs px-6 text-center">
        <p className="text-base font-semibold text-[var(--brand-foreground)]">
          {scopeName}
        </p>
        <p
          className="mt-1 text-sm text-[var(--brand-muted)] transition-opacity duration-300"
          key={i}
        >
          {DETAILS[i]}
        </p>
      </div>
    </div>
  );
}
