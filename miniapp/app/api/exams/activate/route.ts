/**
 * POST /api/exams/activate — admin confirms an extracted key (multipart: "key"
 * = the ExamKey JSON, optional "questions" = questions-only sheet photos). We
 * create the active exam, store the question sheet, and enqueue a broadcast
 * announcement that the bot delivers to every student.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { createActiveExam, setExamQuestionPhotos, enqueueBroadcast, listActiveExams } from "@/lib/db";
import type { ExamKey } from "@/lib/db";
import { saveImage, newGroup } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let key: ExamKey;
  let questionFiles: File[] = [];
  try {
    const form = await req.formData();
    key = JSON.parse(String(form.get("key") ?? ""));
    questionFiles = form
      .getAll("questions")
      .filter((f): f is File => f instanceof File && f.size > 0)
      .slice(0, 8);
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  }
  if (!key?.questions?.length) {
    return NextResponse.json({ error: "مفتاح الإجابة غير صالح." }, { status: 400 });
  }

  const examId = createActiveExam(key, user.id);

  if (questionFiles.length) {
    try {
      const group = newGroup();
      const saved = await Promise.all(questionFiles.map((f, i) => saveImage(f, group, i)));
      setExamQuestionPhotos(examId, saved.map((s) => s.rel));
    } catch (err) {
      console.warn("[activate] saving question sheet failed:", (err as any)?.message ?? err);
    }
  }

  const appUrl = process.env.MINIAPP_URL || "";
  const recipients = enqueueBroadcast(
    `🔔 <b>امتحان جديد متاح!</b>\n\n` +
      `📋 ${key.title || "امتحان"}\n` +
      `📊 الدرجة الكلية: ${key.total_marks}\n\n` +
      `افتح التطبيق واختر الامتحان وأرسل ورقتك. كلما أجبت أسرع زادت نقاطك! ⚡`,
    appUrl ? [[{ text: "🚀 فتح التطبيق", url: appUrl }]] : null,
  );

  return NextResponse.json({ examId, activeCount: listActiveExams().length, recipients });
}
