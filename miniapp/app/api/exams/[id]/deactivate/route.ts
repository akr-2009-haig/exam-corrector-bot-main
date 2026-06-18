/**
 * POST /api/exams/[id]/deactivate — admin stops one active exam.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { getExam, deactivateExam } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const exam = getExam(id);
  if (!exam) return NextResponse.json({ error: "not found" }, { status: 404 });

  deactivateExam(id);
  return NextResponse.json({ ok: true });
}
