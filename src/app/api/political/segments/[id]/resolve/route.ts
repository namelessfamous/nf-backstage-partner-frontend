/**
 * GET /api/political/segments/[id]/resolve
 *
 * Same-origin proxy → GET /api/v1/datastore/segments/<id>/resolve/ on backstage.
 * Forwards pagination, filter, and sort query params to the upstream endpoint,
 * injecting the caller's server-side session Bearer token. Returns {count, results}.
 *
 * Supported query params forwarded upstream:
 *   limit, offset   — pagination
 *   search          — global substring filter
 *   filter          — per-column filter, <colKey>:<value>
 *   sort, dir       — sort column and direction (asc | desc)
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

const BASE_URL = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");

// Params forwarded to the upstream resolve endpoint.
const FORWARDED_PARAMS = ["limit", "offset", "search", "filter", "sort", "dir"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Build upstream URL — forward only known safe params.
  const upstreamParams = new URLSearchParams();
  const incomingParams = request.nextUrl.searchParams;
  for (const key of FORWARDED_PARAMS) {
    const values = incomingParams.getAll(key);
    for (const v of values) {
      upstreamParams.append(key, v);
    }
  }

  const upstreamUrl = `${BASE_URL}/api/v1/datastore/segments/${encodeURIComponent(id)}/resolve/?${upstreamParams.toString()}`;

  const upstream = await fetch(upstreamUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Resolve failed" },
      { status: upstream.status || 502 },
    );
  }

  const data = await upstream.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
