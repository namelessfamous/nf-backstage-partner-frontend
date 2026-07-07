import { NextRequest, NextResponse } from "next/server";
import { SCOPE_COOKIE } from "@/lib/scope";

const VALID_RE = /^(?:all|(?:partner|client):[a-z0-9_-]+)$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scope =
    body && typeof body === "object" && "scope" in body
      ? String((body as Record<string, unknown>).scope)
      : "";

  if (!VALID_RE.test(scope)) {
    return NextResponse.json({ error: "Invalid scope value" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SCOPE_COOKIE, scope, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
