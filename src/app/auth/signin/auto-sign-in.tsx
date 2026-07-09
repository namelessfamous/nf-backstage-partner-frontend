"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AutoSignIn({
  idToken,
  access,
}: {
  idToken: string;
  access: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await signIn("nf-id", {
          id_token: idToken,
          access,
          redirect: false,
        });
        if (cancelled) return;
        if (result?.ok) {
          router.replace("/dashboard");
        } else {
          setError("Authentication failed. Please try signing in again.");
        }
      } catch {
        if (!cancelled) setError("An unexpected error occurred.");
      }
    })();
    return () => { cancelled = true; };
  }, [idToken, access, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
        <div className="max-w-md rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">Sign-in failed</h2>
          <p className="mt-3 text-sm text-[var(--brand-muted)]">{error}</p>
          <a
            href="/"
            className="mt-6 inline-block rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90"
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
      <div className="text-center">
        <div className="mx-auto mb-6 h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-accent)] border-t-[var(--brand-primary)]" />
        <p className="text-sm font-medium text-[var(--brand-muted)]">Completing sign-in…</p>
      </div>
    </div>
  );
}
