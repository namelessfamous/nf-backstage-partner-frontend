/**
 * GET /api/political/segments/[id]/export
 *
 * Same-origin proxy → GET /api/v1/datastore/segments/<id>/export/ on backstage.
 * Streams the full resolved segment as CSV, injecting the caller's server-side
 * session Bearer token. Keeps auth off the client and avoids cross-origin
 * download issues (a bare <a href> to a.namfam.co would carry no Bearer and
 * 401; see the datastore export lesson).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

const BASE_URL = DEFAULT_BACKSTAGE_API_URL.replace(/\/$/, "");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upstream = await fetch(
    `${BASE_URL}/api/v1/datastore/segments/${encodeURIComponent(id)}/export/`,
    {
      headers: {
        Accept: "text/csv",
        Authorization: `Bearer ${session.accessToken}`,
      },
      // Never cache voter-list exports.
      cache: "no-store",
    },
  );

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Export failed" },
      { status: upstream.status || 502 },
    );
  }

  const disposition =
    upstream.headers.get("content-disposition") ??
    `attachment; filename="segment-${id}.csv"`;

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": disposition,
      "Cache-Control": "no-store",
    },
  });
}
