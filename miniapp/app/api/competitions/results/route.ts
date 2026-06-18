/**
 * GET /api/competitions/results — the next unseen competition result for the
 * caller (used for the home "you won / you lost" toast). Auto-settles due
 * matches first, then returns one unacked result (and marks it seen).
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { settleDueCompetitions, takeUnackedResult } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  settleDueCompetitions();
  return NextResponse.json({ result: takeUnackedResult(user.id) });
}
