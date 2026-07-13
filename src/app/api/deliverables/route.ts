/**
 * POST /api/deliverables
 * Proxy → POST /api/v1/deliverables/ on backstage.
 * Used by the Political Mail Grid to create new mail-piece deliverables.
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const res = await fetch(`${BASE_URL}/api/v1/deliverables/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data, { status: res.status });
}
