/**
 * GET /api/results — the caller's own graded attempts (newest first), each
 * with the exam title, score and bonus points earned.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { userSubmissions, getExam } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rows = userSubmissions(user.id, 50).map((r) => ({
    id: r.id,
    examTitle: getExam(r.exam_id)?.key.title || "امتحان",
    awarded: r.score_awarded,
    max: r.score_max,
    bonus: Math.round((r.speed_bonus + r.loyalty_bonus) * 10) / 10,
    at: r.created_at,
  }));

  return NextResponse.json({ results: rows });
}
