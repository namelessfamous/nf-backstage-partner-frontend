"use client";

import { signIn, signOut } from "next-auth/react";

type AuthControlsProps = {
  isAuthenticated: boolean;
};

export function AuthControls({ isAuthenticated }: AuthControlsProps) {
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
