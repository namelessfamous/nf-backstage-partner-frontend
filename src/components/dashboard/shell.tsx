"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { PartnerConfig } from "@/lib/partners";

const NF_ID_LOGOUT_URL = "https://id.namfam.co/logout";

// Clear the local NextAuth session, then hand off to the central nf-id
// logout route so the SSO session is terminated and we don't bounce back in.
async function fullSignOut() {
  await signOut({ redirect: false });
  window.location.href = NF_ID_LOGOUT_URL;
}
import type { ScopeContext } from "@/lib/scope";
import type { Session } from "next-auth";
import { ScopeSelector } from "@/components/dashboard/scope-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { DashboardFooter } from "@/components/dashboard/footer";
import { NavFlyout, type FlyoutEntry } from "@/components/dashboard/nav-flyout";

// User avatar: renders the SSO photo when present, otherwise a colored
// initial. `tone="header"` uses brand fills; `tone="footer"` sits on the
// sidebar gradient and keeps a legible contained chip.
function UserAvatar({
  user,
  tone,
}: {
  user?: Session["user"];
  tone: "header" | "footer";
}) {
  const initial =
    (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase() || "?";
  const base = tone === "header" ? "h-8 w-8 text-sm" : "h-9 w-9 text-sm";
  const fill =
    tone === "header"
      ? "bg-[var(--brand-primary)] text-[var(--brand-on-primary)]"
      : "bg-black/30 text-white ring-1 ring-white/25";

  if (user?.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={user?.name ?? user?.email ?? "User"}
        className={`${base} shrink-0 rounded-full object-cover`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`${base} ${fill} flex shrink-0 items-center justify-center rounded-full font-semibold`}
      title={user?.name ?? user?.email ?? undefined}
    >
      {initial}
    </div>
  );
}

// Composed NF mark used in the header (acid-lime tile + noir glyph).
function NfIcon({ partner }: { partner: PartnerConfig }) {
  if (partner.key === "default") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/nf-icon-composed.svg"
        alt={partner.displayName}
        width={32}
        height={32}
        className="h-8 w-8"
      />
    );
  }
  return (
    <span className="rounded-full bg-[var(--brand-surface-strong)] px-3 py-1 text-xs font-semibold text-[var(--brand-primary)]">
      {partner.displayName}
    </span>
  );
}

// Top-level dashboard link (Task 3) — sits above the resource group.
const DASHBOARD_ITEM = {
  href: "/dashboard",
  label: "Dashboard",
  icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
};

// Resource items — each gets a searchable flyout (Task 4). `key` maps to the
// entries list supplied by the layout via `navData`.
const RESOURCE_ITEMS: {
  key: keyof NavData;
  href: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "budget",
    href: "/dashboard/budget",
    label: "Budget",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "clients",
    href: "/dashboard/clients",
    label: "Clients",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "projects",
    href: "/dashboard/projects",
    label: "Projects",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    key: "proposals",
    href: "/dashboard/proposals",
    label: "Proposals",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: "brands",
    href: "/dashboard/brands",
    label: "Brand Guides",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
  },
];

// Flyout entries per resource, resolved server-side in the dashboard layout.
export type NavData = {
  budget: FlyoutEntry[];
  clients: FlyoutEntry[];
  projects: FlyoutEntry[];
  proposals: FlyoutEntry[];
  brands: FlyoutEntry[];
};

type Props = {
  partner: PartnerConfig;
  user?: Session["user"];
  scopeCtx: ScopeContext;
  navData: NavData;
  children: React.ReactNode;
};

export function DashboardShell({ partner, user, scopeCtx, navData, children }: Props) {
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
        {partner.key === "default" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/namelessfamous-logo.svg"
            alt={partner.displayName}
            className="h-8 w-auto"
          />
        ) : (
          <span
            className="text-lg font-semibold"
            style={{ color: "var(--brand-sidebar-text)" }}
          >
            {partner.displayName}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-visible px-3 py-4">
        {/* Top-level Dashboard link */}
        <Link
          href={DASHBOARD_ITEM.href}
          onClick={closeSidebar}
          style={{ color: "var(--brand-sidebar-text)" }}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            pathname === "/dashboard"
              ? "bg-[var(--brand-sidebar-text)]/15"
              : "hover:bg-[var(--brand-sidebar-text)]/10"
          }`}
        >
          <span className="text-[var(--brand-nav-icon)]">{DASHBOARD_ITEM.icon}</span>
          {DASHBOARD_ITEM.label}
        </Link>

        {/* Divider between Dashboard and resource group */}
        <div
          className="my-2 border-t"
          style={{ borderColor: "color-mix(in srgb, var(--brand-sidebar-text) 15%, transparent)" }}
        />

        {/* Resource items with searchable flyouts */}
        {RESOURCE_ITEMS.map((item) => (
          <NavFlyout
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            entries={navData[item.key]}
            onNavigate={closeSidebar}
          />
        ))}
      </nav>

      {/* User footer */}
      <div
        className="border-t p-4"
        style={{ borderColor: "color-mix(in srgb, var(--brand-sidebar-text) 15%, transparent)" }}
      >
        <div className="flex items-center gap-3">
          <UserAvatar user={user} tone="footer" />
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-medium"
              style={{ color: "var(--brand-sidebar-text)" }}
            >
              {user?.name ?? "Partner user"}
            </p>
            <p
              className="truncate text-xs"
              style={{ color: "color-mix(in srgb, var(--brand-sidebar-text) 60%, transparent)" }}
            >
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => void fullSignOut()}
            title="Sign out"
            style={{ color: "color-mix(in srgb, var(--brand-sidebar-text) 60%, transparent)" }}
            className="rounded-lg p-1.5 transition hover:bg-[var(--brand-sidebar-text)]/10"
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
        style={{ background: `linear-gradient(180deg, var(--brand-sidebar-from), var(--brand-sidebar-to))` }}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-black/5 bg-[var(--brand-surface)] px-4 sm:gap-3 sm:px-6">
          {/* Mobile: NF icon sits to the LEFT of the menu button */}
          <span className="flex items-center lg:hidden">
            <NfIcon partner={partner} />
          </span>

          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-1.5 text-[var(--brand-muted)] transition hover:bg-[var(--brand-surface-strong)] lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Light/dark switcher — sits to the LEFT of the NfIcon */}
          <ThemeToggle defaultMode={partner.defaultMode} />

          {/* Scope selector (only shown when multiple scopes are accessible).
              Collapses to an icon-only dropdown on mobile. */}
          {scopeCtx.showSelector && (
            <ScopeSelector
              active={scopeCtx.active}
              partners={scopeCtx.partners}
              clients={scopeCtx.clients}
            />
          )}

          {/* Partner NF icon + active scope badge — desktop only
              (on mobile the NfIcon already lives on the far left). */}
          <div className="hidden items-center gap-2 sm:flex">
            <NfIcon partner={partner} />
            {scopeLabel && scopeLabel !== partner.displayName && (
              <span className="rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-xs font-medium text-[var(--brand-primary)]/80">
                {scopeLabel}
              </span>
            )}
          </div>

          {/* User menu (avatar dropdown) */}
          <UserMenu user={user} supportEmail={partner.supportEmail} />
        </header>

        {/* Scrollable region: page content + footer */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          <main className="flex-1 p-6 lg:p-8">{children}</main>
          <DashboardFooter partner={partner} />
        </div>
      </div>
    </div>
  );
}
