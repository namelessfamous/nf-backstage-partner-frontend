"use client";

import { useCallback, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

const SIGNED_IN_MESSAGE = "nf-id:signed-in";

type AuthControlsProps = {
  isAuthenticated: boolean;
};

export function AuthControls({ isAuthenticated }: AuthControlsProps) {
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data === SIGNED_IN_MESSAGE) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        popupRef.current?.close();
        window.location.assign("/dashboard");
      }
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const openSignIn = useCallback(() => {
    const width = 480;
    const height = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const popup = window.open(
      "/auth/signin?popup=1",
      "nf-id-signin",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!popup) {
      // Popup blocked — fall back to a full-page redirect flow.
      window.location.assign("/auth/signin");
      return;
    }

    popupRef.current = popup;

    // Fallback if the postMessage never arrives (e.g. opener reference lost):
    // when the popup closes, check whether a session now exists.
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      if (!popup.closed) return;
      if (pollRef.current) window.clearInterval(pollRef.current);
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const session = await res.json();
        if (session?.user) window.location.assign("/dashboard");
      } catch {
        // ignore — user can click sign in again
      }
    }, 600);
  }, []);

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

  return (
    <button
      className="cursor-pointer rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-surface)]"
      onClick={openSignIn}
      type="button"
    >
      Sign in with nf-id
    </button>
  );
}
