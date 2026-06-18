/**
 * GET /api/students/[id] — admin: all of one student's grades + balance.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { userSubmissions, getExam, getUser, resolveName, ledgerBalance } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const studentId = Number((await params).id);
  if (!Number.isFinite(studentId)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const rows = userSubmissions(studentId, 50);
  const name = rows[0]?.student_name || resolveName(getUser(studentId), studentId);

  return NextResponse.json({
    userId: studentId,
    name,
    balance: ledgerBalance(studentId),
    results: rows.map((r) => ({
      id: r.id,
      examId: r.exam_id,
      examTitle: getExam(r.exam_id)?.key.title || "امتحان",
      awarded: r.score_awarded,
      max: r.score_max,
      bonus: Math.round((r.speed_bonus + r.loyalty_bonus) * 10) / 10,
      at: r.created_at,
    })),
  });
}
