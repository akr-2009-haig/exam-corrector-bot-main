/**
 * GET /api/retakes — admin: pending retake requests with student + exam names.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { listPendingRetakeRequests, getExam, getUser, resolveName, lastSubmissionForExam } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const requests = listPendingRetakeRequests().map((r) => {
    const prior = lastSubmissionForExam(r.exam_id, r.user_id);
    return {
      id: r.id,
      examTitle: getExam(r.exam_id)?.key.title || "امتحان",
      studentName: resolveName(getUser(r.user_id), r.user_id),
      priorScore: prior ? { awarded: prior.score_awarded, max: prior.score_max } : null,
      at: r.created_at,
    };
  });
  return NextResponse.json({ requests });
}
