/**
 * GET /api/competitions/[id] — competition detail with the two teams and their
 * live exam-point totals. Auto-settles due matches first.
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import {
  getCompetition,
  competitionTeams,
  competitionEntries,
  userEntry,
  ledgerBalance,
  settleDueCompetitions,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  settleDueCompetitions();

  const { id } = await params;
  const comp = getCompetition(id);
  if (!comp) return NextResponse.json({ error: "not found" }, { status: 404 });

  const teams = competitionTeams(comp).map((t) => ({
    team: t.team,
    total: t.total,
    members: t.members.map((m) => ({
      name: m.userId === user.id ? "أنت" : m.name,
      isMe: m.userId === user.id,
      points: m.points,
    })),
  }));

  const phase =
    comp.status === "settled"
      ? "settled"
      : comp.status === "cancelled"
        ? "cancelled"
        : comp.status === "open"
          ? "open"
          : comp.ends_at && Date.now() >= comp.ends_at
            ? "ended"
            : "live";

  return NextResponse.json({
    id: comp.id,
    title: comp.title,
    format: comp.format,
    teamSize: comp.team_size,
    stake: comp.stake_points,
    prizePerWinner: 2 * comp.stake_points,
    pot: comp.pot_points,
    players: competitionEntries(id).length,
    status: comp.status,
    phase,
    startsAt: comp.starts_at,
    endsAt: comp.ends_at,
    winnerTeam: comp.winner_team,
    joined: !!userEntry(id, user.id),
    myTeam: userEntry(id, user.id)?.team ?? null,
    isAdmin: user.isAdmin,
    balance: ledgerBalance(user.id),
    teams,
  });
}
