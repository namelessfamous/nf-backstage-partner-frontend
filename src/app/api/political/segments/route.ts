/**
 * POST /api/political/segments
 *
 * Same-origin proxy → POST /api/v1/datastore/segments/ on backstage.
 * Creates a new named segment from a filter_def. Admin-only on the backend
 * (IsAdmin permission); non-admin callers receive 403 from upstream.
 *
 * Body forwarded verbatim:
 *   { store: string, name: string, purpose: string, filter: filter_def }
 * where filter_def = { op: "and"|"or", rules: [{ key, cmp, value }] }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

const BASE_URL = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const upstreamUrl = `${BASE_URL}/api/v1/datastore/segments/`;

  const upstream = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, {
    status: upstream.status,
    headers: { "Cache-Control": "no-store" },
  });
}
