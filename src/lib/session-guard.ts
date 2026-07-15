import "server-only";
import type { Session } from "next-auth";

/**
 * A partner NextAuth session cookie lives up to 12h, but the backstage access
 * token it wraps expires sooner — and, more importantly, killing the *central*
 * nf-id SSO session (logging out of backstage or nf-id directly) does NOT
 * touch this app's local cookie. Route guards that only test `if (session)`
 * therefore treat a stale local cookie as "logged in" and sail straight into
 * /dashboard even though the real SSO session is dead. That is the "I logged
 * out everywhere but partner still loaded" bug.
 *
 * `isSessionUsable` collapses "no session" and "session whose access token has
 * expired" into a single logged-out signal. Guards that see an unusable
 * session should bounce through `buildReauthUrl`, which re-enters nf-id's
 * /api/sso — that endpoint re-mints silently IF nf-id is still logged in, or
 * lands the user on the login/passkey screen if not. So a killed SSO session
 * can no longer ride a lingering local cookie into the dashboard, while a
 * still-valid SSO session refreshes with zero friction.
 */
export function isSessionUsable(session: Session | null | undefined): session is Session {
  if (!session) return false;
  // `accessTokenExpired` is computed in the NextAuth session callback (with a
  // 30s skew). When we can read the expiry and it says expired, the session is
  // not usable. When the flag is absent (older token shape), fall back to
  // treating a present session as usable to avoid a redirect loop.
  if (session.accessTokenExpired === true) return false;
  return true;
}
