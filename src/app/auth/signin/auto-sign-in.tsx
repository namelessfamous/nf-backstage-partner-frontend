"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

/** Ordered status stages shown while the SSO session is being established. */
const STAGES = [
  "Verifying your credentials…",
  "Loading your data…",
  "Building your dashboard…",
  "Preparing your deliverables…",
] as const;

export default function AutoSignIn({
  idToken,
  access,
}: {
  idToken: string;
  access: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);

  // Advance the status label on a gentle cadence so the user always sees
  // forward motion instead of a single frozen "Completing sign-in…". The
  // final stage holds until the dashboard route paints.
  useEffect(() => {
    if (error) return;
    const id = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 900);
    return () => clearInterval(id);
  }, [error]);

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
          // Prefetch so the dashboard's own loading.tsx takes over instantly.
          router.prefetch("/dashboard");
          router.replace("/dashboard");
        } else {
          setError("Authentication failed. Please try signing in again.");
        }
      } catch {
        if (!cancelled) setError("An unexpected error occurred.");
      }
    })();
    return () => {
      cancelled = true;
    };
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
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-accent)] border-t-[var(--brand-primary)]" />
        <p
          key={stage}
          className="text-sm font-medium text-[var(--brand-foreground)] transition-opacity duration-300"
        >
          {STAGES[stage]}
        </p>

        {/* Stepped progress bar — fills as each stage advances. */}
        <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-700 ease-out"
            style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
          />
        </div>

        <p className="mt-4 text-xs text-[var(--brand-muted)]">
          Setting up your portal — this only happens once per sign-in.
        </p>
      </div>
    </div>
  );
}
