"use client";

import { signOut } from "next-auth/react";

const NF_ID_LOGOUT_URL = "https://id.namfam.co/logout";

type AuthControlsProps = {
  isAuthenticated: boolean;
};

// Clear the local NextAuth session, then hand off to the central nf-id
// logout route so the SSO session is terminated and we don't bounce back in.
async function fullSignOut() {
  await signOut({ redirect: false });
  window.location.href = NF_ID_LOGOUT_URL;
}

export function AuthControls({ isAuthenticated }: AuthControlsProps) {
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/dashboard"
          className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90"
        >
          Go to dashboard
        </a>
        <button
          className="cursor-pointer rounded-full border border-[var(--brand-secondary)]/20 bg-transparent px-5 py-3 text-sm font-semibold text-[var(--brand-foreground)] transition hover:border-[var(--brand-secondary)]/40"
          onClick={() => void fullSignOut()}
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
      className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-surface)]"
    >
      Sign in with nf-id
    </a>
  );
}
