"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Partner, Client } from "@/types/api";
import type { ScopeValue } from "@/lib/scope";

type Props = {
  active: ScopeValue;
  partners: Partner[];
  clients: Client[];
};

export function ScopeSelector({ active, partners, clients }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const activeName =
    active.type === "all"
      ? "All Scopes"
      : active.type === "partner"
        ? active.name
        : active.type === "client"
          ? active.name
          : "All Scopes";

  async function selectScope(value: string) {
    setOpen(false);
    await fetch("/api/scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: value }),
    });
    startTransition(() => {
      router.refresh();
    });
  }

  const isActiveScope = (value: string) => {
    if (value === "all") return active.type === "all";
    const [type, slug] = value.split(":", 2);
    return active.type === type && (active as { slug?: string }).slug === slug;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 text-sm font-medium transition sm:px-3
          border-[var(--brand-primary)]/25
          bg-[var(--brand-surface-strong)]
          text-[var(--brand-primary)]
          hover:bg-[var(--brand-primary)]/10
          focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30
          ${isPending ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
      >
        {/* Scope icon */}
        <svg
          className="h-3.5 w-3.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7h18M3 12h18M3 17h18"
          />
        </svg>
        {/* Label hidden on mobile — collapses to an icon-only dropdown. */}
        <span className="hidden max-w-[120px] truncate sm:inline">{activeName}</span>
        <svg
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          {/* Dropdown panel */}
          <div
            role="listbox"
            className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-black/10 bg-[var(--brand-surface)] text-[var(--brand-foreground)] shadow-xl"
          >
            {/* All */}
            <div className="p-1.5">
              <button
                role="option"
                aria-selected={active.type === "all"}
                onClick={() => selectScope("all")}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--brand-surface-strong)]
                  ${active.type === "all" ? "font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-foreground)]"}`}
              >
                All Scopes
              </button>
            </div>

            {partners.length > 0 && (
              <div className="border-t border-black/10 p-1.5">
                <p className="mb-1 px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                  Partners
                </p>
                {partners.map((p) => (
                  <button
                    key={p.id}
                    role="option"
                    aria-selected={isActiveScope(`partner:${p.slug}`)}
                    onClick={() => selectScope(`partner:${p.slug}`)}
                    className={`w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--brand-surface-strong)]
                      ${isActiveScope(`partner:${p.slug}`) ? "font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-foreground)]"}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}

            {clients.length > 0 && (
              <div className="border-t border-black/10 p-1.5">
                <p className="mb-1 px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
                  Clients
                </p>
                {clients.map((c) => (
                  <button
                    key={c.id}
                    role="option"
                    aria-selected={isActiveScope(`client:${c.slug}`)}
                    onClick={() => selectScope(`client:${c.slug}`)}
                    className={`flex w-full items-baseline justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--brand-surface-strong)]
                      ${isActiveScope(`client:${c.slug}`) ? "font-semibold text-[var(--brand-primary)]" : "text-[var(--brand-foreground)]"}`}
                  >
                    <span>{c.name}</span>
                    {c.partner_name && (
                      <span className="ml-2 shrink-0 text-[11px] text-[var(--brand-muted)]">
                        {c.partner_name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
