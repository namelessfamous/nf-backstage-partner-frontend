"use client";

/**
 * NavFlyout — a sidebar resource item with a hover/focus flyout that lists the
 * resource's entries and lets the user filter them with a search box, then jump
 * straight to a detail page.
 *
 * Behaviour:
 *   - The row itself is a normal <Link> to the resource list page.
 *   - Hovering (desktop) or focusing the row reveals a floating panel to the
 *     right of the sidebar containing a search input + filtered link list.
 *   - Keyboard: focus the row → Tab into the panel; Escape closes it.
 *   - On mobile (no hover), a chevron toggles the panel inline.
 */

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type FlyoutEntry = {
  /** Stable key + href target for the detail page. */
  href: string;
  /** Primary label (name). */
  label: string;
  /** Optional secondary text (client name, status, etc.). */
  sub?: string;
};

type Props = {
  href: string;
  label: string;
  icon: React.ReactNode;
  entries: FlyoutEntry[];
  onNavigate?: () => void;
};

export function NavFlyout({ href, label, icon, entries, onNavigate }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isActive = pathname.startsWith(href);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(
      (e) =>
        e.label.toLowerCase().includes(needle) ||
        (e.sub ?? "").toLowerCase().includes(needle),
    );
  }, [entries, query]);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  }, [cancelClose]);

  const openNow = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  // Focus the search box shortly after the panel opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
    setQuery("");
  }, [open]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={scheduleClose}
      onFocusCapture={openNow}
      onBlurCapture={(e) => {
        // Close only when focus leaves the whole widget.
        if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleClose();
      }}
    >
      <div
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
          isActive
            ? "bg-[var(--brand-sidebar-text)]/15"
            : "hover:bg-[var(--brand-sidebar-text)]/10"
        }`}
        style={{ color: "var(--brand-sidebar-text)" }}
      >
        <Link
          href={href}
          onClick={onNavigate}
          className="flex flex-1 items-center gap-3"
          style={{ color: "var(--brand-sidebar-text)" }}
        >
          <span className="text-[var(--brand-nav-icon)]">{icon}</span>
          {label}
        </Link>
        {/* Flyout toggle (mainly for touch / keyboard). */}
        <button
          type="button"
          aria-label={`Browse ${label}`}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md p-0.5 opacity-70 transition hover:opacity-100"
          style={{ color: "var(--brand-sidebar-text)" }}
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="absolute left-full top-0 z-40 ml-1 w-72 lg:ml-2"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div className="overflow-hidden rounded-2xl border border-black/10 bg-[var(--brand-surface)] text-[var(--brand-foreground)] shadow-2xl">
            <div className="border-b border-black/5 p-2">
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-muted)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
                  />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full rounded-xl border border-black/10 bg-[var(--brand-surface-strong)] py-2 pl-8 pr-3 text-sm text-[var(--brand-foreground)] outline-none placeholder:text-[var(--brand-muted)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-[var(--brand-muted)]">
                  {entries.length === 0
                    ? `No ${label.toLowerCase()} in scope.`
                    : `No matches for “${query}”.`}
                </p>
              ) : (
                filtered.map((e) => {
                  const active = pathname === e.href;
                  return (
                    <Link
                      key={e.href}
                      href={e.href}
                      onClick={() => {
                        setOpen(false);
                        onNavigate?.();
                      }}
                      className={`flex items-baseline justify-between gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-[var(--brand-surface-strong)] ${
                        active
                          ? "font-semibold text-[var(--brand-primary)]"
                          : "text-[var(--brand-foreground)]"
                      }`}
                    >
                      <span className="truncate">{e.label}</span>
                      {e.sub && (
                        <span className="ml-2 shrink-0 truncate text-[11px] text-[var(--brand-muted)]">
                          {e.sub}
                        </span>
                      )}
                    </Link>
                  );
                })
              )}
            </div>

            {entries.length > 0 && (
              <div className="border-t border-black/5 p-1.5">
                <Link
                  href={href}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="block rounded-xl px-3 py-2 text-center text-xs font-medium text-[var(--brand-primary)] transition hover:bg-[var(--brand-surface-strong)]"
                >
                  View all {label} →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
