/**
 * POST /api/political/stores/[id]/preview
 *
 * Same-origin proxy → POST /api/v1/datastore/stores/<id>/preview/ on backstage.
 * Injects the caller's server-side session Bearer token. Forwards the JSON
 * request body verbatim: { filter, sort, limit, offset, household_dedupe? }.
 * Returns {count, results}.
 *
 * Use this for filtered + sorted access to the voter file (voter list view).
 * The `filter` field is a filter_def object per the backend grammar:
 *   { op: "and"|"or", rules: [{ key, cmp, value }] }
 * where cmp ∈ eq|ne|gt|gte|lt|lte|contains|in|exists. `sort` is
 * [{ key, dir: "asc"|"desc" }].
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

const BASE_URL = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const upstreamUrl = `${BASE_URL}/api/v1/datastore/stores/${encodeURIComponent(id)}/preview/`;

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

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Preview failed" },
      { status: upstream.status || 502 },
    );
  }

  const data = await upstream.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
