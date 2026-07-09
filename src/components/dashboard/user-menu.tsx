"use client";

/**
 * UserMenu — the header (top-right) avatar turned into a dropdown user menu.
 *
 * Replaces the previously static header avatar. Clicking the avatar toggles a
 * menu with the signed-in identity, quick links, and a Sign out action that
 * clears the local NextAuth session then hands off to the central nf-id
 * logout endpoint.
 */

import { useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LifeBuoy, LogOut } from "lucide-react";
import type { Session } from "next-auth";

// Logout is a plain server-route navigation. Using a real <a href> (not an
// onClick handler) means it works even if client JS is stale/unhydrated —
// the previous onClick approach could silently no-op and leave the user on
// the dashboard. The route clears the local session then hands off to nf-id.
const LOGOUT_HREF = "/api/auth/logout";

function Avatar({ user }: { user?: Session["user"] }) {
  const initial =
    (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase() || "?";

  if (user?.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.image}
        alt={user?.name ?? user?.email ?? "User"}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-semibold text-[var(--brand-on-primary)]">
      {initial}
    </div>
  );
}

export function UserMenu({
  user,
  supportEmail,
}: {
  user?: Session["user"];
  supportEmail?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        className="flex items-center rounded-full ring-offset-2 ring-offset-[var(--brand-surface)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
      >
        <Avatar user={user} />
      </button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-black/10 bg-[var(--brand-surface)] shadow-xl"
          >
            {/* Identity */}
            <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
              <Avatar user={user} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--brand-foreground)]">
                  {user?.name ?? "Partner user"}
                </p>
                {user?.email && (
                  <p className="truncate text-xs text-[var(--brand-muted)]">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="py-1">
              <Link
                href="/dashboard"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--brand-foreground)] transition hover:bg-[var(--brand-surface-strong)]"
              >
                <LayoutDashboard className="size-4 text-[var(--brand-muted)]" />
                Dashboard
              </Link>
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                    "Support",
                  )}`}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--brand-foreground)] transition hover:bg-[var(--brand-surface-strong)]"
                >
                  <LifeBuoy className="size-4 text-[var(--brand-muted)]" />
                  Support
                </a>
              )}
            </div>

            {/* Sign out — plain anchor so it never depends on hydrated JS */}
            <div className="border-t border-black/5 py-1">
              <a
                href={LOGOUT_HREF}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-500 transition hover:bg-red-500/10"
              >
                <LogOut className="size-4" />
                Sign out
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
