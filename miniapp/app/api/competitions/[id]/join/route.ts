/**
 * POST /api/competitions/[id]/join — stake points to enter a competition.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { joinCompetition, ledgerBalance } from "@/lib/db";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  not_found: "المسابقة غير موجودة.",
  closed: "انتهى وقت الانضمام لهذه المسابقة.",
  full: "اكتمل عدد اللاعبين في هذه المسابقة.",
  already: "أنت مشترك بالفعل في هذه المسابقة.",
  insufficient: "نقاطك لا تكفي لدفع الرهان.",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const err = joinCompetition(id, user.id);
  if (err) {
    return NextResponse.json({ error: MESSAGES[err] ?? "تعذّر الانضمام." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, balance: ledgerBalance(user.id) });
}
