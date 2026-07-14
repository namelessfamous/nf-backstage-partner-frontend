/**
 * GET /api/political/stores/[id]/analytics
 *
 * Same-origin proxy → GET /api/v1/datastore/stores/<id>/analytics/ on backstage.
 * Injects the caller's server-side session Bearer token. Forwards election_type,
 * weight, top, and the optional filter (JSON string) query params.
 *
 * The `filter` param is an URL-encoded JSON filter_def object per the backend
 * grammar: { op: "and"|"or", rules: [{ key, cmp, value }] }
 * When present, analytics are computed over the filtered subset only.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

const BASE_URL = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");

const FORWARDED_PARAMS = ["election_type", "weight", "top", "filter"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upstreamParams = new URLSearchParams();
  const incomingParams = request.nextUrl.searchParams;
  for (const key of FORWARDED_PARAMS) {
    const val = incomingParams.get(key);
    if (val !== null) upstreamParams.set(key, val);
  }

  const upstreamUrl = `${BASE_URL}/api/v1/datastore/stores/${encodeURIComponent(id)}/analytics/?${upstreamParams.toString()}`;

  const upstream = await fetch(upstreamUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Analytics failed" },
      { status: upstream.status || 502 },
    );
  }

  const data = await upstream.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
