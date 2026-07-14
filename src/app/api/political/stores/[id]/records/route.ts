/**
 * GET /api/political/stores/[id]/records
 *
 * Same-origin proxy → GET /api/v1/datastore/stores/<id>/records/ on backstage.
 * Injects the caller's server-side session Bearer token. Forwards pagination
 * query params: limit, offset. Returns {count, results}.
 *
 * NOTE: This endpoint does NOT support filter/sort. Use the /preview proxy
 * (POST) for filtered + sorted access to the voter file.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

const BASE_URL = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");

const FORWARDED_PARAMS = ["limit", "offset"];

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
    const values = incomingParams.getAll(key);
    for (const v of values) {
      upstreamParams.append(key, v);
    }
  }

  const qs = upstreamParams.toString();
  const upstreamUrl = `${BASE_URL}/api/v1/datastore/stores/${encodeURIComponent(id)}/records/${qs ? `?${qs}` : ""}`;

  const upstream = await fetch(upstreamUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Records fetch failed" },
      { status: upstream.status || 502 },
    );
  }

  const data = await upstream.json();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
