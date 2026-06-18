/**
 * POST /api/retakes/[id]/resolve — admin grants ({granted:true}) or denies a
 * retake request, then the student is notified via the bot.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { resolveRetakeRequest, grantRetake, getExam, enqueueOutbox } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const granted = !!body?.granted;

  const reqRow = resolveRetakeRequest(id, granted);
  if (!reqRow) return NextResponse.json({ error: "not found" }, { status: 404 });

  const title = getExam(reqRow.exam_id)?.key.title || "الامتحان";
  if (granted) {
    grantRetake(reqRow.exam_id, reqRow.user_id, user.id);
    enqueueOutbox(
      reqRow.user_id,
      `🎉 سمح لك المعلّم بمحاولة جديدة!\n\n📋 ${title}\n\nافتح التطبيق واختر الامتحان وأرسل ورقتك.`,
    );
  } else {
    enqueueOutbox(reqRow.user_id, `ℹ️ لم يوافق المعلّم على منحك محاولة جديدة في «${title}».`);
  }

  return NextResponse.json({ ok: true, granted });
}
