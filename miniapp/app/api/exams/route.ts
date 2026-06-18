/**
 * GET /api/exams — active exams. For students each carries their own status
 * (answered + score, or not yet). For admins it carries attempt stats so the
 * same list powers the management view.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import {
  listActiveExams,
  lastSubmissionForExam,
  hasRetake,
  examStats,
  safeJson,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const exams = listActiveExams().map(({ row, key }) => {
    const prior = user.isAdmin ? null : lastSubmissionForExam(row.id, user.id);
    const questionPhotos = safeJson<string[]>(row.question_photo_ids) ?? [];
    return {
      id: row.id,
      title: key.title || "امتحان",
      totalMarks: key.total_marks,
      createdAt: row.created_at,
      questionCount: key.questions?.length ?? 0,
      hasQuestionSheet: questionPhotos.length > 0,
      // student-only:
      answered: !!prior,
      myScore: prior ? { awarded: prior.score_awarded, max: prior.score_max } : null,
      canRetake: prior ? hasRetake(row.id, user.id) : false,
      // admin-only:
      stats: user.isAdmin ? examStats(row.id) : null,
    };
  });

  return NextResponse.json({ exams, isAdmin: user.isAdmin });
}
