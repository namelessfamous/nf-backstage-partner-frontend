/**
 * POST /api/deliverables/[id]/upload
 * 1. Proxies the multipart upload to POST /api/v1/media/upload/
 * 2. PATCHes the deliverable's files M2M to include the new media id
 * 3. Returns the media object
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

  // Forward the multipart form data directly to backstage
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Upload the media
  const uploadRes = await fetch(`${BASE_URL}/api/v1/media/upload/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      // Do NOT set Content-Type — let fetch set boundary for multipart
    },
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({ error: "Upload failed" }));
    return NextResponse.json(err, { status: uploadRes.status });
  }

  const media = await uploadRes.json();
  const mediaId: string = media.id;

  // Fetch current deliverable to get existing files list
  const delRes = await fetch(`${BASE_URL}/api/v1/deliverables/${id}/`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  if (!delRes.ok) {
    // Upload succeeded but we couldn't attach — still return the media
    return NextResponse.json({ media, warning: "Could not attach to deliverable" }, { status: 207 });
  }

  const deliverable = await delRes.json();
  const existingFiles: string[] = (deliverable.files ?? []);
  const updatedFiles = [...existingFiles, mediaId];

  // PATCH the deliverable to include the new file
  const patchRes = await fetch(`${BASE_URL}/api/v1/deliverables/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ files: updatedFiles }),
  });

  if (!patchRes.ok) {
    return NextResponse.json({ media, warning: "Upload succeeded but file not attached" }, { status: 207 });
  }

  return NextResponse.json(media, { status: 200 });
}
