"use client";

import { signIn, signOut } from "next-auth/react";

type AuthControlsProps = {
  isAuthenticated: boolean;
};

export function AuthControls({ isAuthenticated }: AuthControlsProps) {
  if (isAuthenticated) {
    return (
      <button
        className="cursor-pointer rounded-full bg-[var(--brand-secondary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-surface)]"
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      className="cursor-pointer rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-surface)]"
      onClick={() => signIn("nf-id", { callbackUrl: "/" })}
      type="button"
    >
      Sign in with nf-id
    </button>
  );
}
