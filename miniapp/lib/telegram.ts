/**
 * Telegram Mini App `initData` validation (HMAC-SHA256 per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
 */
import crypto from "node:crypto";

export interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/**
 * Returns the authenticated Telegram user, or null when the signature is
 * missing/invalid or the data is older than `maxAgeSec`.
 */
export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSec = 24 * 60 * 60,
): TgUser | null {
  try {
    if (!initData || !botToken) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");

    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join("\n");

    const secret = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(dataCheckString)
      .digest("hex");

    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const authDate = Number(params.get("auth_date") || 0);
    if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;

    const rawUser = params.get("user");
    return rawUser ? (JSON.parse(rawUser) as TgUser) : null;
  } catch {
    return null;
  }
}
