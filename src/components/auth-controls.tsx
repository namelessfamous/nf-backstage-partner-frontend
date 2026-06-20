"use client";

import { signIn, signOut } from "next-auth/react";

type AuthControlsProps = {
  authConfigured: boolean;
  isAuthenticated: boolean;
  partnerName: string;
};

export function AuthControls({
  authConfigured,
  isAuthenticated,
  partnerName,
}: AuthControlsProps) {
  if (!authConfigured) {
    return (
      <div className="rounded-3xl border border-dashed border-[var(--brand-primary)]/40 bg-[var(--brand-surface-strong)] px-5 py-4 text-sm text-[var(--brand-muted)]">
        Add nf-id client credentials to enable sign-in for {partnerName}.
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <button
        className="cursor-pointer rounded-full bg-[var(--brand-secondary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      className="cursor-pointer rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
      onClick={() => signIn("nf-id", { callbackUrl: "/" })}
      type="button"
    >
      Sign in with nf-id
    </button>
  );
}
