/**
 * POST /api/competitions/[id]/settle — admin force-ends a running match now
 * (winner = team with most exam points so far), or { cancel: true } refunds and
 * cancels the lobby. Matches normally auto-settle when their time is up.
 * Participants are notified via the bot; the in-app toast shows on next open.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import {
  getCompetition,
  settleCompetition,
  cancelCompetition,
  competitionEntries,
  enqueueOutbox,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const comp = getCompetition(id);
  if (!comp) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  if (body?.cancel) {
    if (!cancelCompetition(id)) return NextResponse.json({ error: "تعذّر الإلغاء." }, { status: 400 });
    for (const e of competitionEntries(id)) {
      enqueueOutbox(e.user_id, `↩️ أُلغيت مسابقة «${comp.title}» وأُعيدت نقاط رهانك (${e.stake_paid}).`);
    }
    return NextResponse.json({ ok: true, cancelled: true });
  }

  const res = settleCompetition(id);
  if (res === "not_found") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (res === "bad_state") {
    return NextResponse.json({ error: "لا يمكن حسم هذه المسابقة الآن." }, { status: 400 });
  }

  for (const e of competitionEntries(id)) {
    const won = res.winnerTeam !== 0 && e.team === res.winnerTeam;
    enqueueOutbox(
      e.user_id,
      res.winnerTeam === 0
        ? `↩️ انتهت مسابقة «${comp.title}» بالتعادل وأُعيدت نقاط رهانك.`
        : won
          ? `🏆 مبروك! فاز فريقك في «${comp.title}» وربحت ${res.each} نقطة!`
          : `😔 انتهت مسابقة «${comp.title}». فاز الفريق الآخر — حظًا أوفر!`,
    );
  }
  return NextResponse.json({ ok: true, winnerTeam: res.winnerTeam, each: res.each });
}
