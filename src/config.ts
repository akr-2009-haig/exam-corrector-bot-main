/**
 * Bot configuration. The bot is now a thin launcher: it opens the Mini App,
 * keeps the channel-join gate, and delivers notifications the Mini App queues
 * in the `outbox` table. All product logic lives in the Mini App.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(/[,\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n !== 0);
}

export const config = {
  botToken: required("BOT_TOKEN"),

  /** Telegram user ids treated as admins (mirrors the Mini App's ADMIN_IDS). */
  adminIds: parseIds(process.env.ADMIN_IDS),

  /** HTTPS URL of the Mini App — opened from the launch button / menu button. */
  miniAppUrl: process.env.MINIAPP_URL || "",

  /** Forced-membership gate (empty id → disabled). Bot must be channel admin. */
  requiredChannelId: process.env.REQUIRED_CHANNEL_ID || "",
  requiredChannelUsername: (process.env.REQUIRED_CHANNEL_USERNAME || "").replace(/^@/, ""),
};

export function isAdmin(userId: number | undefined): boolean {
  return userId !== undefined && config.adminIds.includes(userId);
}
