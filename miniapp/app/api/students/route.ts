/**
 * GET /api/students — admin: students who have submitted, most recent first.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { listStudents } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const students = listStudents(200).map((s) => ({
    userId: s.user_id,
    name: s.student_name || `#${s.user_id}`,
    attempts: s.attempts,
    lastAt: s.last_at,
  }));
  return NextResponse.json({ students });
}
