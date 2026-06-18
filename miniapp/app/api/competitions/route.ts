/**
 * GET  /api/competitions — offered formats + live/open/finished competitions
 *                          (with my join status). Auto-settles due matches.
 * POST /api/competitions — admin creates a competition: { format, startsAt, endsAt }.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import {
  listCompetitions,
  createCompetition,
  competitionFormats,
  competitionEntries,
  userEntry,
  ledgerBalance,
  settleDueCompetitions,
  formatName,
  type CompetitionRow,
} from "@/lib/db";

export const dynamic = "force-dynamic";

function phase(c: CompetitionRow): string {
  if (c.status === "settled") return "settled";
  if (c.status === "cancelled") return "cancelled";
  if (c.status === "open") {
    // starts_at has arrived but lazy transition hasn't run yet — show as live
    if (c.starts_at > 0 && Date.now() >= c.starts_at) return "live";
    return "open";
  }
  if (c.ends_at && Date.now() >= c.ends_at) return "ended";
  return "live";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  settleDueCompetitions();

  const competitions = listCompetitions().map((c) => {
    const entries = competitionEntries(c.id);
    const mine = userEntry(c.id, user.id);
    return {
      id: c.id,
      title: c.title,
      format: c.format,
      teamSize: c.team_size,
      stake: c.stake_points,
      prizePerWinner: 2 * c.stake_points,
      pot: c.pot_points,
      players: entries.length,
      status: c.status,
      phase: phase(c),
      startsAt: c.starts_at,
      endsAt: c.ends_at,
      winnerTeam: c.winner_team,
      joined: !!mine,
      myTeam: mine?.team ?? null,
    };
  });

  return NextResponse.json({
    formats: competitionFormats().map((f) => ({ ...f, name: formatName(f.format) })),
    competitions,
    isAdmin: user.isAdmin,
    balance: ledgerBalance(user.id),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const format = Number(body?.format);
  if (![2, 4, 6, 8].includes(format)) {
    return NextResponse.json({ error: "صيغة غير صالحة." }, { status: 400 });
  }

  const startsAt = Number(body?.startsAt);
  const endsAt = Number(body?.endsAt);
  const now = Date.now();
  if (!startsAt || !endsAt || startsAt >= endsAt || endsAt <= now) {
    return NextResponse.json({ error: "وقت البداية أو النهاية غير صالح." }, { status: 400 });
  }

  // One active (open/running) competition per format at a time.
  const exists = listCompetitions().some(
    (c) => c.format === format && (c.status === "open" || c.status === "running"),
  );
  if (exists) {
    return NextResponse.json({ error: "توجد مسابقة نشطة بهذه الصيغة بالفعل." }, { status: 409 });
  }

  const id = createCompetition(format, user.id, startsAt, endsAt);
  return NextResponse.json({ id });
}
