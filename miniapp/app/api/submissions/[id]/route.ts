/**
 * GET /api/submissions/[id] — the full per-item correction of one submission.
 * Visible to the submission's owner or to any admin.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { getSubmission, getExam, safeJson, type GradingResult } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const sub = getSubmission(id);
  if (!sub) return NextResponse.json({ error: "هذه النتيجة لم تعد متوفّرة." }, { status: 404 });
  if (sub.user_id !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = safeJson<GradingResult>(sub.result_json);
  if (!result) return NextResponse.json({ error: "نتيجة تالفة." }, { status: 500 });

  const photoCount = (safeJson<string[]>(sub.photo_ids) ?? []).length;

  return NextResponse.json({
    id: sub.id,
    examTitle: getExam(sub.exam_id)?.key.title || "امتحان",
    studentName: sub.student_name,
    awarded: sub.score_awarded,
    max: sub.score_max,
    speedBonus: sub.speed_bonus,
    loyaltyBonus: sub.loyalty_bonus,
    at: sub.created_at,
    result,
    // Only admins get the answer-sheet photos; students already have theirs.
    photoUrls: user.isAdmin
      ? Array.from({ length: photoCount }, (_, i) => `/api/submissions/${sub.id}/photo/${i}`)
      : [],
  });
}
