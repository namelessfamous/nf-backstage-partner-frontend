import "server-only";
import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

const BASE_URL = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");

/**
 * Thrown when the backstage API rejects the request as unauthenticated
 * (401) — i.e. the embedded access token has expired or is invalid. Server
 * components catch this and `redirect()` to the nf-id re-auth flow instead of
 * silently rendering empty data. A 403 (authenticated but not permitted) is
 * NOT treated as a session expiry — that stays a soft empty result.
 */
export class SessionExpiredError extends Error {
  constructor() {
    super("SESSION_EXPIRED");
    this.name = "SessionExpiredError";
  }
}

type FetchOptions = {
  /** Next.js revalidation in seconds. 0 = no-store, undefined = 30s default. */
  revalidate?: number | false;
};

async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  try {
    const session = await getServerSession(authOptions);
    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`;
    }
  } catch {
    // Session unavailable — proceed unauthenticated
  }
  return headers;
}

export async function apiGet<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T | null> {
  const headers = await buildHeaders();
  const revalidate = opts.revalidate === undefined ? 30 : opts.revalidate;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers,
      next: revalidate === false ? { revalidate: 0 } : { revalidate },
    });
  } catch {
    // Network/transport failure — soft-degrade to empty.
    return null;
  }

  // 401 = expired/invalid session → signal the caller to re-authenticate.
  // This must propagate (not be swallowed) so pages redirect instead of
  // painting all-zero data on a lapsed token.
  if (res.status === 401) throw new SessionExpiredError();
  // 403 = authenticated but not allowed → legitimate empty result.
  if (res.status === 403) return null;
  if (!res.ok) return null;

  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Soft-degrade helper for parallel fetches: swallow ordinary failures to an
 * empty array, but re-throw {@link SessionExpiredError} so a lapsed session
 * still triggers a redirect instead of a silent all-zero render.
 *
 * Usage: `apiList(...).catch(emptyOnError<Foo>)`
 */
export function emptyOnError<T>(err: unknown): T[] {
  if (err instanceof SessionExpiredError) throw err;
  return [] as T[];
}

/** Convenience wrapper for DRF paginated list endpoints. Returns the results array. */
export async function apiList<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T[]> {
  type PaginatedResult = { results: T[]; count: number };
  const data = await apiGet<PaginatedResult | T[]>(path, opts);
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

/**
 * Request-scoped memoized list fetch. Because most portal fetches use
 * `revalidate: 0` (no-store), Next.js fetch dedup is disabled and identical
 * endpoints hit the network once per caller. Several endpoints
 * (deliverables / clients / projects / proposals / brands) are consumed by
 * BOTH the dashboard layout (sidebar nav) AND the child page in the same
 * render pass. Wrapping in React `cache()` collapses those duplicate calls to
 * a single network round-trip for the lifetime of one server render.
 *
 * Keyed by the exact `path` string, so scoped URLs with different query params
 * remain distinct. Only use for GET list endpoints that are safe to share
 * within a single request.
 */
export const apiListCached = cache(
  async <T>(path: string): Promise<T[]> => apiList<T>(path, { revalidate: 0 }),
);

/** Request-scoped memoized single-object GET (mirrors {@link apiListCached}). */
export const apiGetCached = cache(
  async <T>(path: string): Promise<T | null> =>
    apiGet<T>(path, { revalidate: 0 }),
);
