"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { PartnerConfig } from "@/lib/partners";
import type { ScopeContext } from "@/lib/scope";
import type { Session } from "next-auth";
import { ScopeSelector } from "@/components/dashboard/scope-selector";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Deliverables",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/projects",
    label: "Projects",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
];

type Props = {
  partner: PartnerConfig;
  user?: Session["user"];
  scopeCtx: ScopeContext;
  children: React.ReactNode;
};

export function DashboardShell({ partner, user, scopeCtx, children }: Props) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Derive a human-readable label for the active scope (shown next to partner badge).
  const scopeLabel =
    scopeCtx.active.type === "all"
      ? null
      : scopeCtx.active.type === "partner"
        ? scopeCtx.active.name
        : scopeCtx.active.type === "client"
          ? scopeCtx.active.name
          : null;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Partner wordmark */}
      <div className="flex h-16 shrink-0 items-center border-b border-black/10 px-6">
        <span className="text-lg font-semibold text-black">{partner.displayName}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
            {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user?.name ?? "Partner user"}
            </p>
            <p className="truncate text-xs text-white/60">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: `linear-gradient(180deg, var(--brand-primary), var(--brand-secondary))` }}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/5 bg-[var(--brand-surface)] px-6">
          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-1.5 text-[var(--brand-muted)] transition hover:bg-[var(--brand-surface-strong)] lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Scope selector (only shown when multiple scopes are accessible) */}
          {scopeCtx.showSelector && (
            <ScopeSelector
              active={scopeCtx.active}
              partners={scopeCtx.partners}
              clients={scopeCtx.clients}
            />
          )}

          {/* Partner + active scope badge */}
          <div className="hidden items-center gap-2 sm:flex">
            {partner.key === "default" ? (
              <span className="flex items-center rounded-full bg-[var(--brand-foreground)] px-3 py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://r2.namfam.co/namelessfamous-logo-min.svg"
                  alt={partner.displayName}
                  className="h-5 w-auto"
                />
              </span>
            ) : (
              <span className="rounded-full bg-[var(--brand-surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--brand-primary)]">
                {partner.displayName}
              </span>
            )}
            {scopeLabel && scopeLabel !== partner.displayName && (
              <span className="rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--brand-primary)]/80">
                {scopeLabel}
              </span>
            )}
          </div>

          {/* User avatar */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-semibold text-[var(--brand-on-primary)]">
            {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
