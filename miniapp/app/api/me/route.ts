/**
 * GET  /api/me   — the caller's profile, role, points balance and gate status.
 * POST /api/me   — set the student's display name ({ name }).
 *
 * Also keeps the `users` table fresh (the bot used to do this on every update;
 * now most users only ever touch the Mini App).
 */
import { type NextRequest, NextResponse } from "next/server";
import { authUser } from "@/lib/auth";
import { channelConfig, isChannelMember } from "@/lib/membership";
import { upsertUser, getUser, setDisplayName, ledgerBalance, resolveName } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) {
    return NextResponse.json({ error: "افتح هذه الصفحة من داخل تيليجرام" }, { status: 401 });
  }

  upsertUser(user.id, user.first_name ?? null, user.username ?? null);

  const gated = !user.isAdmin && !(await isChannelMember(user.id));
  const row = getUser(user.id);

  return NextResponse.json({
    id: user.id,
    name: resolveName(row, user.id),
    hasName: !!row?.display_name,
    isAdmin: user.isAdmin,
    balance: ledgerBalance(user.id),
    gated,
    channel: channelConfig(),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = authUser(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "الاسم فارغ" }, { status: 400 });

  setDisplayName(user.id, name);
  return NextResponse.json({ ok: true, name });
}
