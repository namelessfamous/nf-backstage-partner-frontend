type AuthControlsProps = {
  isAuthenticated: boolean;
};

// Logout is a plain server-route navigation rendered as a real <a href> so it
// works without any client JS.
const LOGOUT_HREF = "/api/auth/logout";

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
        <a
          className="cursor-pointer rounded-full border border-[var(--brand-secondary)]/20 bg-transparent px-5 py-3 text-sm font-semibold text-[var(--brand-foreground)] transition hover:border-[var(--brand-secondary)]/40"
          href={LOGOUT_HREF}
        >
          Sign out
        </a>
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
