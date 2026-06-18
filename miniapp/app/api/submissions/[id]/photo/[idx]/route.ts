/**
 * GET /api/submissions/[id]/photo/[idx] — stream one stored answer-sheet image.
 * Admins only (used by the "view sheet" admin view).
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { getSubmission, safeJson } from "@/lib/db";
import { readImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; idx: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id, idx } = await params;
  const sub = getSubmission(id);
  if (!sub) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (sub.user_id !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const paths = safeJson<string[]>(sub.photo_ids) ?? [];
  const rel = paths[Number(idx)];
  if (!rel) return NextResponse.json({ error: "not found" }, { status: 404 });

  const img = await readImage(rel);
  if (!img) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(img.buf), {
    headers: { "Content-Type": img.contentType, "Cache-Control": "private, max-age=3600" },
  });
}
