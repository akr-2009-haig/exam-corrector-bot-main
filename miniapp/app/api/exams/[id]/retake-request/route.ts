/**
 * POST /api/exams/[id]/retake-request — a student asks for another attempt.
 * Records a pending request and notifies admins (they approve in the app).
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import {
  getExam,
  lastSubmissionForExam,
  hasRetake,
  addRetakeRequest,
  getUser,
  resolveName,
  enqueueOutbox,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function adminIds(): number[] {
  return (process.env.ADMIN_IDS || "")
    .split(/[,\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n !== 0);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: examId } = await params;
  const exam = getExam(examId);
  if (!exam || !exam.row.is_active) {
    return NextResponse.json({ error: "هذا الامتحان لم يعد متاحًا." }, { status: 404 });
  }
  if (!lastSubmissionForExam(examId, user.id)) {
    return NextResponse.json({ error: "لم تقدّم محاولة بعد." }, { status: 400 });
  }
  if (hasRetake(examId, user.id)) {
    return NextResponse.json({ ok: true, alreadyGranted: true });
  }

  addRetakeRequest(examId, user.id);
  const name = resolveName(getUser(user.id), user.id);
  const title = exam.key.title || "الامتحان";
  for (const adminId of adminIds()) {
    enqueueOutbox(
      adminId,
      `🙏 طلب محاولة جديدة\n\n👤 ${name}\n📋 ${title}\n\nافتح التطبيق للموافقة أو الرفض.`,
    );
  }

  return NextResponse.json({ ok: true });
}
