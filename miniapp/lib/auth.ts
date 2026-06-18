/**
 * Request authentication for API routes. Validates the Telegram `initData`
 * (sent in the `x-init-data` header) and resolves the caller's role.
 *
 * Local testing: with ALLOW_ANON=1 an unsigned request is treated as a fake
 * user (id from `x-debug-id` header, default 1), so the API can be exercised
 * with curl outside Telegram.
 */
import type { NextRequest } from "next/server";
import { validateInitData, type TgUser } from "./telegram";

export interface AuthedUser extends TgUser {
  isAdmin: boolean;
}

function adminIds(): Set<number> {
  return new Set(
    (process.env.ADMIN_IDS || "")
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n !== 0),
  );
}

export function isAdminId(userId: number): boolean {
  return adminIds().has(userId);
}

/** Authenticated caller, or null when the signature is missing/invalid. */
export function authUser(req: NextRequest): AuthedUser | null {
  const initData = req.headers.get("x-init-data") || "";
  const user = validateInitData(initData, process.env.BOT_TOKEN || "");
  if (user) return { ...user, isAdmin: isAdminId(user.id) };

  if (process.env.ALLOW_ANON === "1") {
    const id = Number(req.headers.get("x-debug-id") || "1") || 1;
    return { id, first_name: "Tester", isAdmin: isAdminId(id) };
  }
  return null;
}
