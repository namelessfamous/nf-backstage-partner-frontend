"use client";

import { signOut } from "next-auth/react";

type AuthControlsProps = {
  isAuthenticated: boolean;
};

export function AuthControls({ isAuthenticated }: AuthControlsProps) {
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/dashboard"
          className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Go to dashboard
        </a>
        <button
          className="cursor-pointer rounded-full border border-[var(--brand-secondary)]/20 bg-transparent px-5 py-3 text-sm font-semibold text-[var(--brand-foreground)] transition hover:border-[var(--brand-secondary)]/40"
          onClick={() => signOut({ callbackUrl: "/" })}
          type="button"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Standard full-page redirect flow: /auth/signin bounces through nf-id SSO
  // and returns via /api/auth/sso-callback.
  return (
    <a
      href="/auth/signin"
      className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-surface)]"
    >
      Sign in with nf-id
    </a>
  );
}
