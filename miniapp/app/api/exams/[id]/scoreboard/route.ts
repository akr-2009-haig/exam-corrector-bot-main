/**
 * GET /api/exams/[id]/scoreboard — admin: each student's latest attempt, best
 * first.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { getExam, examScoreboard } from "@/lib/db";

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

  const rows = examScoreboard(id).map((r, i) => ({
    rank: i + 1,
    id: r.id,
    name: r.student_name || `طالب #${r.user_id}`,
    awarded: r.score_awarded,
    max: r.score_max,
  }));

  return NextResponse.json({ title: exam.key.title || "امتحان", rows });
}
