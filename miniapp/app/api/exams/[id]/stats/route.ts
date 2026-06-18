/**
 * GET /api/exams/[id]/stats — admin: aggregate stats + recent attempts.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { getExam, examStats, recentSubmissionsForExam } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const exam = getExam(id);
  if (!exam) return NextResponse.json({ error: "not found" }, { status: 404 });

  const attempts = recentSubmissionsForExam(id, 50).map((r) => ({
    id: r.id,
    name: r.student_name || `طالب #${r.user_id}`,
    awarded: r.score_awarded,
    max: r.score_max,
    at: r.created_at,
  }));

  return NextResponse.json({
    title: exam.key.title || "امتحان",
    totalMarks: exam.key.total_marks,
    isActive: !!exam.row.is_active,
    stats: examStats(id),
    attempts,
  });
}
