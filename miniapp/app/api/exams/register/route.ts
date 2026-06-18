/**
 * POST /api/exams/register — admin uploads answer-key photo(s) (multipart
 * "photos"); we extract a structured exam key and return it for preview.
 * Nothing is saved yet — the admin confirms via /api/exams/activate.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { EXTRACTION_PROMPT } from "@/lib/prompts";
import type { ExamKey } from "@/lib/db";
import { visionJSON, imagePart, MODELS, type ContentPart } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let files: File[];
  try {
    const form = await req.formData();
    files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 8);
  } catch {
    return NextResponse.json({ error: "تعذّر قراءة الصور." }, { status: 400 });
  }
  if (!files.length) return NextResponse.json({ error: "أرسل صورة مفتاح الإجابة." }, { status: 400 });

  try {
    const parts: ContentPart[] = [
      { type: "text", text: "هذه صورة (أو صور) مفتاح إجابة امتحان. استخرجها." },
      ...(await Promise.all(
        files.map(async (f) => {
          const buf = Buffer.from(await f.arrayBuffer());
          const mime = f.type?.startsWith("image/") ? f.type : "image/jpeg";
          return imagePart(`data:${mime};base64,${buf.toString("base64")}`);
        }),
      )),
    ];
    const key = await visionJSON<ExamKey>(MODELS.extraction(), EXTRACTION_PROMPT, parts);
    if (!key?.questions?.length) throw new Error("empty key");
    return NextResponse.json({ key });
  } catch (err) {
    console.error("[register] extraction failed:", (err as any)?.message ?? err);
    return NextResponse.json(
      { error: "تعذّر استخراج مفتاح الإجابة. تأكد أن الصورة واضحة وأعد المحاولة." },
      { status: 422 },
    );
  }
}
