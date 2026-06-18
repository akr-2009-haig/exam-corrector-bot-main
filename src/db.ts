/**
 * Minimal bot-side database access (bun:sqlite). The Mini App owns the full
 * schema and all writes; the bot only needs to keep the `users` table fresh
 * and drain the `outbox` of notifications the Mini App queued.
 *
 * Tables are created with IF NOT EXISTS so the bot and the Mini App can both
 * open the same WAL database safely.
 */
import { Database } from "bun:sqlite";
import { randomUUID } from "crypto";

const db = new Database("bot.db", { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 5000;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id      INTEGER PRIMARY KEY,
    first_name   TEXT,
    username     TEXT,
    display_name TEXT,
    selected_exam_id TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS outbox (
    id           TEXT PRIMARY KEY,
    user_id      INTEGER NOT NULL,
    text         TEXT NOT NULL,
    buttons_json TEXT,
    created_at   INTEGER NOT NULL,
    sent_at      INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_unsent ON outbox(sent_at);
`);

const stmts = {
  upsertUser: db.query(
    `INSERT INTO users (user_id, first_name, username, created_at, updated_at)
     VALUES ($user_id, $first_name, $username, $now, $now)
     ON CONFLICT(user_id) DO UPDATE SET
       first_name = COALESCE($first_name, first_name),
       username   = COALESCE($username, username),
       updated_at = $now`,
  ),
  unsent: db.query(
    `SELECT * FROM outbox WHERE sent_at IS NULL ORDER BY created_at ASC LIMIT $limit`,
  ),
  markSent: db.query(`UPDATE outbox SET sent_at = $now WHERE id = $id`),
};

export function upsertUser(
  userId: number,
  firstName: string | undefined,
  username: string | undefined,
): void {
  stmts.upsertUser.run({
    $user_id: userId,
    $first_name: firstName ?? null,
    $username: username ?? null,
    $now: Date.now(),
  });
}

export interface OutboxRow {
  id: string;
  user_id: number;
  text: string;
  buttons_json: string | null;
  created_at: number;
  sent_at: number | null;
}

export function unsentOutbox(limit = 25): OutboxRow[] {
  return stmts.unsent.all({ $limit: limit }) as OutboxRow[];
}

export function markOutboxSent(id: string): void {
  stmts.markSent.run({ $id: id, $now: Date.now() });
}

export { db, randomUUID };
