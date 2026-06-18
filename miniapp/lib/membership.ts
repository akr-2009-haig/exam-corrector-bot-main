/**
 * Forced channel membership ("join gate"), enforced from the Mini App side.
 * Mirrors the bot's `src/membership.ts` but calls the Telegram Bot API over
 * HTTP (no telegraf). The gate is disabled when REQUIRED_CHANNEL_ID is empty.
 *
 * The bot must be an ADMIN of the channel for getChatMember to work; if the
 * check itself fails (misconfig) we FAIL OPEN rather than lock everyone out.
 */
export function channelConfig() {
  return {
    id: process.env.REQUIRED_CHANNEL_ID || "",
    username: (process.env.REQUIRED_CHANNEL_USERNAME || "").replace(/^@/, ""),
  };
}

/** Is `userId` a member of the required channel? Gate off → always true. */
export async function isChannelMember(userId: number): Promise<boolean> {
  const { id } = channelConfig();
  const token = process.env.BOT_TOKEN || "";
  if (!id || !token) return true;

  try {
    const url =
      `https://api.telegram.org/bot${token}/getChatMember` +
      `?chat_id=${encodeURIComponent(id)}&user_id=${userId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data: any = await res.json();
    if (!data?.ok) {
      console.warn("[membership] getChatMember failed:", JSON.stringify(data?.description));
      return true; // fail open
    }
    const status = data.result?.status;
    return (
      status === "creator" ||
      status === "administrator" ||
      status === "member" ||
      (status === "restricted" && data.result?.is_member === true)
    );
  } catch (err) {
    console.warn("[membership] getChatMember error:", (err as any)?.message ?? err);
    return true; // fail open
  }
}
