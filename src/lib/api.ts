import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

const BASE_URL = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");

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

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers,
      next: revalidate === false ? { revalidate: 0 } : { revalidate },
    });

    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
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
