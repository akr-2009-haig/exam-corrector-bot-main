/**
 * Full data layer over the bot's SQLite database (../bot.db), shared by the
 * Mini App's API routes. Originally read-only (leaderboard); now the Mini App
 * owns all the logic, so this module also WRITES (exams, submissions, retakes,
 * the points ledger, competitions and the notification outbox).
 *
 * Points model: a "points ledger" is the single source of truth. A user's
 * balance is SUM(delta) over their ledger rows — exam scores + bonuses credit
 * it, bet stakes debit it, bet payouts credit it. The leaderboard ranks by
 * balance. On first run the ledger is back-filled from existing submissions so
 * nothing already earned is lost.
 *
 * The bot writes the same file from a separate process; SQLite WAL + a busy
 * timeout make that safe (we keep transactions short).
 */
import Database from "better-sqlite3";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { GradingResult } from "./prompts";

const DB_PATH =
  process.env.BOT_DB_PATH || path.resolve(process.cwd(), "..", "bot.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  const db = new Database(DB_PATH, { fileMustExist: false });
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  bootstrap(db);
  _db = db;
  return db;
}

/** Create every table/column we rely on (idempotent — safe with the bot). */
function bootstrap(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL DEFAULT '',
      key_json    TEXT NOT NULL,
      total_marks REAL NOT NULL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 0,
      created_by  INTEGER,
      created_at  INTEGER NOT NULL,
      question_photo_ids TEXT
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id            TEXT PRIMARY KEY,
      exam_id       TEXT NOT NULL,
      user_id       INTEGER NOT NULL,
      username      TEXT,
      student_name  TEXT,
      photo_ids     TEXT,
      is_test       INTEGER NOT NULL DEFAULT 0,
      score_awarded REAL NOT NULL,
      score_max     REAL NOT NULL,
      speed_bonus   REAL NOT NULL DEFAULT 0,
      loyalty_bonus REAL NOT NULL DEFAULT 0,
      result_json   TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      user_id      INTEGER PRIMARY KEY,
      first_name   TEXT,
      username     TEXT,
      display_name TEXT,
      selected_exam_id TEXT,
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS retakes (
      exam_id    TEXT NOT NULL,
      user_id    INTEGER NOT NULL,
      granted_by INTEGER,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (exam_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS pending_results (
      submission_id TEXT PRIMARY KEY,
      chat_id       INTEGER NOT NULL,
      deliver_at    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS miniapp_seen (
      user_id INTEGER PRIMARY KEY,
      rank    INTEGER NOT NULL,
      points  REAL NOT NULL,
      seen_at INTEGER NOT NULL
    );

    -- Single source of truth for "points".
    CREATE TABLE IF NOT EXISTS points_ledger (
      id         TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL,
      delta      REAL NOT NULL,
      kind       TEXT NOT NULL,
      ref        TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_user ON points_ledger(user_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_time ON points_ledger(created_at);

    CREATE TABLE IF NOT EXISTS competitions (
      id             TEXT PRIMARY KEY,
      title          TEXT NOT NULL DEFAULT '',
      created_by     INTEGER,
      format         INTEGER NOT NULL DEFAULT 2,
      team_size      INTEGER NOT NULL DEFAULT 1,
      starts_at      INTEGER NOT NULL DEFAULT 0,
      ends_at        INTEGER NOT NULL DEFAULT 0,
      stake_points   REAL NOT NULL DEFAULT 0,
      status         TEXT NOT NULL DEFAULT 'open',
      winner_team    INTEGER,
      pot_points     REAL NOT NULL DEFAULT 0,
      created_at     INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS competition_entries (
      competition_id TEXT NOT NULL,
      user_id        INTEGER NOT NULL,
      team           INTEGER NOT NULL DEFAULT 1,
      joined_at      INTEGER NOT NULL,
      stake_paid     REAL NOT NULL DEFAULT 0,
      payout         REAL NOT NULL DEFAULT 0,
      acked          INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (competition_id, user_id)
    );

    -- Student retake requests, approved/denied by an admin inside the app.
    CREATE TABLE IF NOT EXISTS retake_requests (
      id         TEXT PRIMARY KEY,
      exam_id    TEXT NOT NULL,
      user_id    INTEGER NOT NULL,
      status     TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_retreq_status ON retake_requests(status);

    -- Notifications the bot sends out on the mini app's behalf.
    CREATE TABLE IF NOT EXISTS outbox (
      id          TEXT PRIMARY KEY,
      user_id     INTEGER NOT NULL,
      text        TEXT NOT NULL,
      buttons_json TEXT,
      created_at  INTEGER NOT NULL,
      sent_at     INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_unsent ON outbox(sent_at);
  `);

  // Additive migrations for a pre-existing database created by the old bot.
  for (const sql of [
    `ALTER TABLE submissions ADD COLUMN speed_bonus REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE submissions ADD COLUMN loyalty_bonus REAL NOT NULL DEFAULT 0`,
    `ALTER TABLE exams ADD COLUMN question_photo_ids TEXT`,
    `ALTER TABLE users ADD COLUMN selected_exam_id TEXT`,
    `ALTER TABLE competitions ADD COLUMN format INTEGER NOT NULL DEFAULT 2`,
    `ALTER TABLE competitions ADD COLUMN team_size INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE competitions ADD COLUMN winner_team INTEGER`,
    `ALTER TABLE competition_entries ADD COLUMN team INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE competition_entries ADD COLUMN acked INTEGER NOT NULL DEFAULT 0`,
  ]) {
    try {
      db.exec(sql);
    } catch {
      /* column already exists */
    }
  }

  backfillLedger(db);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExamItem {
  n: number;
  prompt: string;
  answer: string;
  marks: number;
}
export interface ExamQuestion {
  number: string;
  title: string;
  type: string;
  max_marks: number;
  items: ExamItem[];
}
export interface ExamKey {
  title: string;
  questions: ExamQuestion[];
  total_marks: number;
}
export interface ExamRow {
  id: string;
  title: string;
  key_json: string;
  total_marks: number;
  is_active: number;
  created_by: number | null;
  created_at: number;
  question_photo_ids: string | null;
}
export interface UserRow {
  user_id: number;
  first_name: string | null;
  username: string | null;
  display_name: string | null;
  selected_exam_id: string | null;
  created_at: number;
  updated_at: number;
}
export interface SubmissionRow {
  id: string;
  exam_id: string;
  user_id: number;
  username: string | null;
  student_name: string | null;
  photo_ids: string | null;
  is_test: number;
  score_awarded: number;
  score_max: number;
  speed_bonus: number;
  loyalty_bonus: number;
  result_json: string;
  created_at: number;
}
export interface CompetitionRow {
  id: string;
  title: string;
  created_by: number | null;
  /** Player capacity (2/4/6/8). Two teams of `format/2`. */
  format: number;
  team_size: number;
  starts_at: number; // set when the lobby fills (match start)
  ends_at: number; // starts_at + duration; auto-settled after this
  stake_points: number;
  status: "open" | "running" | "settled" | "cancelled";
  winner_team: number | null; // 1, 2, or 0 (tie/refund)
  pot_points: number;
  created_at: number;
}
export interface CompetitionEntryRow {
  competition_id: string;
  user_id: number;
  team: number; // 1 or 2
  joined_at: number;
  stake_paid: number;
  payout: number;
  acked: number; // 1 once the user has seen the result toast
}

export function safeJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─── Users ──────────────────────────────────────────────────────────────────

export function upsertUser(
  userId: number,
  firstName: string | null | undefined,
  username: string | null | undefined,
): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO users (user_id, first_name, username, created_at, updated_at)
       VALUES (@id, @first, @username, @now, @now)
       ON CONFLICT(user_id) DO UPDATE SET
         first_name = COALESCE(@first, first_name),
         username   = COALESCE(@username, username),
         updated_at = @now`,
    )
    .run({ id: userId, first: firstName ?? null, username: username ?? null, now });
}

export function setDisplayName(userId: number, name: string): void {
  getDb()
    .prepare(`UPDATE users SET display_name = @name, updated_at = @now WHERE user_id = @id`)
    .run({ id: userId, name, now: Date.now() });
}

export function getUser(userId: number): UserRow | null {
  return (
    (getDb().prepare(`SELECT * FROM users WHERE user_id = ?`).get(userId) as
      | UserRow
      | undefined) ?? null
  );
}

/** Best human name: chosen → Telegram first name → @username → #id. */
export function resolveName(user: UserRow | null, fallbackId: number): string {
  if (!user) return `#${fallbackId}`;
  return (
    user.display_name?.trim() ||
    user.first_name?.trim() ||
    (user.username ? `@${user.username}` : `#${fallbackId}`)
  );
}

export function allUserIds(): number[] {
  return (getDb().prepare(`SELECT user_id FROM users`).all() as { user_id: number }[]).map(
    (r) => r.user_id,
  );
}

// ─── Exams ──────────────────────────────────────────────────────────────────

export function createActiveExam(key: ExamKey, createdBy: number | null): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO exams (id, title, key_json, total_marks, is_active, created_by, created_at)
       VALUES (@id, @title, @key, @total, 1, @by, @at)`,
    )
    .run({
      id,
      title: key.title || "",
      key: JSON.stringify(key),
      total: key.total_marks || 0,
      by: createdBy,
      at: Date.now(),
    });
  return id;
}

export function listActiveExams(): { row: ExamRow; key: ExamKey }[] {
  const rows = getDb()
    .prepare(`SELECT * FROM exams WHERE is_active = 1 ORDER BY created_at DESC`)
    .all() as ExamRow[];
  const out: { row: ExamRow; key: ExamKey }[] = [];
  for (const row of rows) {
    const key = safeJson<ExamKey>(row.key_json);
    if (key) out.push({ row, key });
  }
  return out;
}

export function listExams(limit = 20): ExamRow[] {
  return getDb()
    .prepare(`SELECT * FROM exams ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as ExamRow[];
}

export function getExam(id: string): { row: ExamRow; key: ExamKey } | null {
  const row = getDb().prepare(`SELECT * FROM exams WHERE id = ?`).get(id) as
    | ExamRow
    | undefined;
  const key = safeJson<ExamKey>(row?.key_json);
  if (!row || !key) return null;
  return { row, key };
}

export function deactivateExam(id: string): void {
  getDb()
    .prepare(`UPDATE exams SET is_active = 0, question_photo_ids = NULL WHERE id = ?`)
    .run(id);
}

export function setExamQuestionPhotos(id: string, photoPaths: string[]): void {
  getDb()
    .prepare(`UPDATE exams SET question_photo_ids = @ids WHERE id = @id`)
    .run({ id, ids: JSON.stringify(photoPaths) });
}

// ─── Submissions ────────────────────────────────────────────────────────────

export function recordSubmission(params: {
  examId: string;
  userId: number;
  username: string | null;
  studentName: string;
  photoPaths: string[];
  isTest: boolean;
  scoreAwarded: number;
  scoreMax: number;
  speedBonus: number;
  loyaltyBonus: number;
  result: unknown;
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO submissions
        (id, exam_id, user_id, username, student_name, photo_ids, is_test,
         score_awarded, score_max, speed_bonus, loyalty_bonus, result_json, created_at)
       VALUES
        (@id, @exam, @user, @username, @name, @photos, @test,
         @awarded, @max, @speed, @loyalty, @result, @at)`,
    )
    .run({
      id,
      exam: params.examId,
      user: params.userId,
      username: params.username,
      name: params.studentName,
      photos: JSON.stringify(params.photoPaths),
      test: params.isTest ? 1 : 0,
      awarded: params.scoreAwarded,
      max: params.scoreMax,
      speed: params.speedBonus,
      loyalty: params.loyaltyBonus,
      result: JSON.stringify(params.result),
      at: Date.now(),
    });
  return id;
}

export function getSubmission(id: string): SubmissionRow | null {
  return (
    (getDb().prepare(`SELECT * FROM submissions WHERE id = ?`).get(id) as
      | SubmissionRow
      | undefined) ?? null
  );
}

export function userSubmissions(userId: number, limit = 30): SubmissionRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM submissions WHERE is_test = 0 AND user_id = ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as SubmissionRow[];
}

export function lastSubmissionForExam(examId: string, userId: number): SubmissionRow | null {
  return (
    (getDb()
      .prepare(
        `SELECT * FROM submissions
         WHERE is_test = 0 AND exam_id = @exam AND user_id = @user
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get({ exam: examId, user: userId }) as SubmissionRow | undefined) ?? null
  );
}

export function recentSubmissionsForExam(examId: string, limit = 50): SubmissionRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM submissions WHERE is_test = 0 AND exam_id = ?
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(examId, limit) as SubmissionRow[];
}

/** Each student's LATEST real attempt on an exam, best ratio first. */
export function examScoreboard(examId: string): SubmissionRow[] {
  return getDb()
    .prepare(
      `SELECT s.* FROM submissions s
       JOIN (
         SELECT user_id, MAX(created_at) AS mc FROM submissions
         WHERE is_test = 0 AND exam_id = @exam GROUP BY user_id
       ) m ON m.user_id = s.user_id AND m.mc = s.created_at
       WHERE s.is_test = 0 AND s.exam_id = @exam
       ORDER BY s.score_awarded * 1.0 / NULLIF(s.score_max, 0) DESC`,
    )
    .all({ exam: examId }) as SubmissionRow[];
}

/**
 * Loyalty streak: how many of the most-recent exams (counting `currentExamId`
 * itself) the user answered consecutively, walking back from it with no gap.
 * Used for the loyalty bonus.
 */
export function loyaltyStreak(userId: number, currentExamId: string): number {
  const current = getExam(currentExamId);
  if (!current) return 1;
  const prior = getDb()
    .prepare(
      `SELECT id FROM exams WHERE created_at < ? ORDER BY created_at DESC LIMIT 30`,
    )
    .all(current.row.created_at) as { id: string }[];
  let streak = 1; // the current exam
  for (const e of prior) {
    if (lastSubmissionForExam(e.id, userId)) streak++;
    else break;
  }
  return streak;
}

export interface ExamStats {
  n: number;
  students: number;
  avgPct: number;
  maxPct: number;
  minPct: number;
  bands: [number, number, number, number];
}

export function examStats(examId: string): ExamStats {
  const r = getDb()
    .prepare(
      `SELECT
         COUNT(*)                                          AS n,
         COUNT(DISTINCT user_id)                           AS students,
         AVG(score_awarded * 100.0 / NULLIF(score_max, 0)) AS avg_pct,
         MAX(score_awarded * 100.0 / NULLIF(score_max, 0)) AS max_pct,
         MIN(score_awarded * 100.0 / NULLIF(score_max, 0)) AS min_pct,
         SUM(CASE WHEN score_awarded * 100.0 / NULLIF(score_max,0) >= 90 THEN 1 ELSE 0 END) AS band_a,
         SUM(CASE WHEN score_awarded * 100.0 / NULLIF(score_max,0) >= 75
                   AND score_awarded * 100.0 / NULLIF(score_max,0) < 90 THEN 1 ELSE 0 END) AS band_b,
         SUM(CASE WHEN score_awarded * 100.0 / NULLIF(score_max,0) >= 50
                   AND score_awarded * 100.0 / NULLIF(score_max,0) < 75 THEN 1 ELSE 0 END) AS band_c,
         SUM(CASE WHEN score_awarded * 100.0 / NULLIF(score_max,0) < 50 THEN 1 ELSE 0 END) AS band_d
       FROM submissions WHERE is_test = 0 AND exam_id = ?`,
    )
    .get(examId) as any;
  return {
    n: r?.n ?? 0,
    students: r?.students ?? 0,
    avgPct: r?.avg_pct ?? 0,
    maxPct: r?.max_pct ?? 0,
    minPct: r?.min_pct ?? 0,
    bands: [r?.band_a ?? 0, r?.band_b ?? 0, r?.band_c ?? 0, r?.band_d ?? 0],
  };
}

export interface StudentSummary {
  user_id: number;
  student_name: string | null;
  attempts: number;
  last_at: number;
}

export function listStudents(limit = 100): StudentSummary[] {
  return getDb()
    .prepare(
      `SELECT user_id,
              MAX(student_name) AS student_name,
              COUNT(*)          AS attempts,
              MAX(created_at)   AS last_at
       FROM submissions WHERE is_test = 0
       GROUP BY user_id ORDER BY last_at DESC LIMIT ?`,
    )
    .all(limit) as StudentSummary[];
}

// ─── Retakes ────────────────────────────────────────────────────────────────

export function grantRetake(examId: string, userId: number, grantedBy: number): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO retakes (exam_id, user_id, granted_by, created_at)
       VALUES (@exam, @user, @by, @at)`,
    )
    .run({ exam: examId, user: userId, by: grantedBy, at: Date.now() });
}

export function hasRetake(examId: string, userId: number): boolean {
  return (
    getDb()
      .prepare(`SELECT 1 FROM retakes WHERE exam_id = @exam AND user_id = @user`)
      .get({ exam: examId, user: userId }) !== undefined
  );
}

export function consumeRetake(examId: string, userId: number): void {
  getDb()
    .prepare(`DELETE FROM retakes WHERE exam_id = @exam AND user_id = @user`)
    .run({ exam: examId, user: userId });
}

/** Drop the student's earlier attempt(s) on this exam, keeping `keepId`. */
export function replaceOldSubmissions(examId: string, userId: number, keepId: string): void {
  getDb()
    .prepare(
      `DELETE FROM submissions
       WHERE is_test = 0 AND exam_id = @exam AND user_id = @user AND id != @keep`,
    )
    .run({ exam: examId, user: userId, keep: keepId });
}

// ─── Retake requests ────────────────────────────────────────────────────────

export interface RetakeRequestRow {
  id: string;
  exam_id: string;
  user_id: number;
  status: "pending" | "granted" | "denied";
  created_at: number;
}

/** Create (or refresh) a pending retake request; returns its id. */
export function addRetakeRequest(examId: string, userId: number): string {
  // Collapse repeats: one pending request per (exam,user).
  getDb()
    .prepare(
      `DELETE FROM retake_requests WHERE exam_id = @exam AND user_id = @user AND status = 'pending'`,
    )
    .run({ exam: examId, user: userId });
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO retake_requests (id, exam_id, user_id, status, created_at)
       VALUES (@id, @exam, @user, 'pending', @at)`,
    )
    .run({ id, exam: examId, user: userId, at: Date.now() });
  return id;
}

export function listPendingRetakeRequests(): RetakeRequestRow[] {
  return getDb()
    .prepare(`SELECT * FROM retake_requests WHERE status = 'pending' ORDER BY created_at ASC`)
    .all() as RetakeRequestRow[];
}

export function resolveRetakeRequest(id: string, granted: boolean): RetakeRequestRow | null {
  const row = getDb().prepare(`SELECT * FROM retake_requests WHERE id = ?`).get(id) as
    | RetakeRequestRow
    | undefined;
  if (!row) return null;
  getDb()
    .prepare(`UPDATE retake_requests SET status = @s WHERE id = @id`)
    .run({ id, s: granted ? "granted" : "denied" });
  return row;
}

// ─── Points ledger ──────────────────────────────────────────────────────────

export type LedgerKind =
  | "exam_base"
  | "exam_bonus"
  | "bet_stake"
  | "bet_payout"
  | "bet_refund"
  | "admin_adjust";

export function postLedger(
  userId: number,
  delta: number,
  kind: LedgerKind,
  ref: string | null,
  at: number = Date.now(),
): void {
  if (!delta) return;
  getDb()
    .prepare(
      `INSERT INTO points_ledger (id, user_id, delta, kind, ref, created_at)
       VALUES (@id, @user, @delta, @kind, @ref, @at)`,
    )
    .run({ id: randomUUID(), user: userId, delta, kind, ref, at });
}

export function ledgerBalance(userId: number): number {
  const r = getDb()
    .prepare(`SELECT COALESCE(SUM(delta), 0) AS bal FROM points_ledger WHERE user_id = ?`)
    .get(userId) as { bal: number };
  return Math.round((r?.bal ?? 0) * 10) / 10;
}

/** Exam points (base + bonus only) a user earned inside [from, to]. */
export function examPointsInWindow(userId: number, from: number, to: number): number {
  const r = getDb()
    .prepare(
      `SELECT COALESCE(SUM(delta), 0) AS pts FROM points_ledger
       WHERE user_id = @user AND kind IN ('exam_base','exam_bonus')
         AND created_at >= @from AND created_at <= @to`,
    )
    .get({ user: userId, from, to }) as { pts: number };
  return r?.pts ?? 0;
}

/** Reverse a user's exam ledger rows for one exam (used on retake replace). */
export function reverseExamLedger(examId: string, userId: number): void {
  const rows = getDb()
    .prepare(
      `SELECT delta FROM points_ledger
       WHERE user_id = @user AND ref = @ref AND kind IN ('exam_base','exam_bonus')`,
    )
    .all({ user: userId, ref: examId }) as { delta: number }[];
  const sum = rows.reduce((a, r) => a + r.delta, 0);
  if (sum) postLedger(userId, -sum, "admin_adjust", `reverse:${examId}`);
}

/** Seed the ledger from existing submissions the first time we run. */
function backfillLedger(db: Database.Database): void {
  const has = db.prepare(`SELECT 1 FROM points_ledger LIMIT 1`).get();
  if (has) return;
  const rows = db
    .prepare(
      `SELECT s.user_id, s.exam_id, s.score_awarded, s.created_at
       FROM submissions s
       JOIN (
         SELECT exam_id, user_id, MAX(created_at) AS mc FROM submissions
         WHERE is_test = 0 GROUP BY exam_id, user_id
       ) m ON m.exam_id = s.exam_id AND m.user_id = s.user_id AND m.mc = s.created_at
       WHERE s.is_test = 0`,
    )
    .all() as { user_id: number; exam_id: string; score_awarded: number; created_at: number }[];
  const insert = db.prepare(
    `INSERT INTO points_ledger (id, user_id, delta, kind, ref, created_at)
     VALUES (?, ?, ?, 'exam_base', ?, ?)`,
  );
  const tx = db.transaction(() => {
    for (const r of rows) {
      if (!r.score_awarded) continue;
      insert.run(randomUUID(), r.user_id, r.score_awarded, r.exam_id, r.created_at);
    }
  });
  tx();
}

// ─── Leaderboard (ranks by ledger balance) ──────────────────────────────────

export interface LeaderboardEntry {
  userId: number;
  name: string;
  points: number;
  exams: number;
  lastAt: number;
}

function adminIds(): Set<number> {
  return new Set(
    (process.env.ADMIN_IDS || "")
      .split(/[,\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n !== 0),
  );
}

/** Ranked students by ledger balance accrued at/after `since` (ms). */
export function leaderboard(since: number): LeaderboardEntry[] {
  const admins = adminIds();
  const rows = getDb()
    .prepare(
      `SELECT
         pl.user_id AS userId,
         COALESCE(
           NULLIF(TRIM(u.display_name), ''),
           NULLIF(TRIM(u.first_name), ''),
           '#' || pl.user_id
         ) AS name,
         SUM(pl.delta) AS points,
         MAX(pl.created_at) AS lastAt
       FROM points_ledger pl
       LEFT JOIN users u ON u.user_id = pl.user_id
       WHERE pl.created_at >= ?
       GROUP BY pl.user_id
       HAVING points > 0
       ORDER BY points DESC, lastAt ASC`,
    )
    .all(since) as (LeaderboardEntry & { points: number })[];

  // exam count = distinct exams the user has a real submission for.
  const examCount = getDb().prepare(
    `SELECT COUNT(DISTINCT exam_id) AS c FROM submissions WHERE is_test = 0 AND user_id = ?`,
  );
  return rows
    .filter((r) => !admins.has(r.userId))
    .map((r) => ({
      ...r,
      points: Math.round(r.points * 10) / 10,
      exams: (examCount.get(r.userId) as { c: number }).c,
    }));
}

export interface SeenSnapshot {
  rank: number;
  points: number;
}
export function getSeen(userId: number): SeenSnapshot | null {
  return (
    (getDb()
      .prepare(`SELECT rank, points FROM miniapp_seen WHERE user_id = ?`)
      .get(userId) as SeenSnapshot | undefined) ?? null
  );
}
export function setSeen(userId: number, rank: number, points: number): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO miniapp_seen (user_id, rank, points, seen_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(userId, rank, points, Date.now());
}

// ─── Competitions / betting (team-based, format presets) ────────────────────
// Four formats (2/4/6/8 players) → two teams of `format/2`. Players stake a
// preset number of points to join a lobby; when it fills the match starts and
// runs for a fixed duration, after which it auto-settles: the team with the
// most exam points earned during the window takes the pot (split per winner).

export interface CompetitionFormat {
  format: number;
  teamSize: number;
  stake: number;
  /** Points each member of the winning team receives (= 2× stake; fair). */
  prizePerWinner: number;
}

/** Parse COMP_STAKES ("2:10,4:10,…") → stake per format (equal per person). */
function stakeForFormat(format: number): number {
  const raw = process.env.COMP_STAKES || "2:10,4:10,6:10,8:10";
  const map = new Map<number, number>();
  for (const part of raw.split(",")) {
    const [f, s] = part.split(":").map((x) => Number(x.trim()));
    if (Number.isFinite(f) && Number.isFinite(s)) map.set(f!, s!);
  }
  return map.get(format) ?? 10;
}

/** The four offered formats with their preset economics. */
export function competitionFormats(): CompetitionFormat[] {
  return [2, 4, 6, 8].map((format) => {
    const stake = stakeForFormat(format);
    return { format, teamSize: format / 2, stake, prizePerWinner: 2 * stake };
  });
}

/** Esports-style mode names by team size (Solo / Duo / Trio / Squad). */
const FORMAT_NAME: Record<number, string> = {
  2: "فردي",
  4: "ثنائي",
  6: "ثلاثي",
  8: "رباعي",
};
export function formatName(format: number): string {
  return FORMAT_NAME[format] ?? `${format} لاعبين`;
}

export function createCompetition(
  format: number,
  createdBy: number,
  startsAt: number,
  endsAt: number,
): string {
  const id = randomUUID();
  const stake = stakeForFormat(format);
  getDb()
    .prepare(
      `INSERT INTO competitions
         (id, title, created_by, format, team_size, starts_at, ends_at,
          stake_points, status, pot_points, created_at)
       VALUES (@id, @title, @by, @format, @team, @starts, @ends, @stake, 'open', 0, @at)`,
    )
    .run({
      id,
      title: formatName(format),
      by: createdBy,
      format,
      team: format / 2,
      starts: startsAt,
      ends: endsAt,
      stake,
      at: Date.now(),
    });
  return id;
}

export function listCompetitions(): CompetitionRow[] {
  return getDb()
    .prepare(`SELECT * FROM competitions ORDER BY created_at DESC LIMIT 60`)
    .all() as CompetitionRow[];
}

export function getCompetition(id: string): CompetitionRow | null {
  return (
    (getDb().prepare(`SELECT * FROM competitions WHERE id = ?`).get(id) as
      | CompetitionRow
      | undefined) ?? null
  );
}

export function competitionEntries(id: string): CompetitionEntryRow[] {
  return getDb()
    .prepare(`SELECT * FROM competition_entries WHERE competition_id = ? ORDER BY joined_at ASC`)
    .all(id) as CompetitionEntryRow[];
}

export function userEntry(id: string, userId: number): CompetitionEntryRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM competition_entries WHERE competition_id = @c AND user_id = @u`)
      .get({ c: id, u: userId }) as CompetitionEntryRow | undefined) ?? null
  );
}

/**
 * Join a competition lobby: check balance, debit the stake, assign the player
 * to the smaller team, grow the pot, and start the match if it just filled.
 */
export function joinCompetition(
  id: string,
  userId: number,
): "not_found" | "closed" | "full" | "already" | "insufficient" | null {
  const db = getDb();
  return db.transaction(() => {
    const comp = getCompetition(id);
    if (!comp) return "not_found" as const;
    if (comp.status !== "open") return "closed" as const;
    // Joining closes when the match starts.
    if (comp.starts_at > 0 && Date.now() >= comp.starts_at) return "closed" as const;
    if (userEntry(id, userId)) return "already" as const;
    const entries = competitionEntries(id);
    if (entries.length >= comp.format) return "full" as const;
    if (ledgerBalance(userId) < comp.stake_points) return "insufficient" as const;

    // Balance teams: put the new player on whichever team has fewer members.
    const t1 = entries.filter((e) => e.team === 1).length;
    const t2 = entries.filter((e) => e.team === 2).length;
    const team = t1 <= t2 ? 1 : 2;

    postLedger(userId, -comp.stake_points, "bet_stake", id);
    db.prepare(
      `INSERT INTO competition_entries (competition_id, user_id, team, joined_at, stake_paid, acked)
       VALUES (@c, @u, @team, @at, @stake, 0)`,
    ).run({ c: id, u: userId, team, at: Date.now(), stake: comp.stake_points });
    db.prepare(`UPDATE competitions SET pot_points = pot_points + @stake WHERE id = @c`).run({
      c: id,
      stake: comp.stake_points,
    });
    return null;
  })();
}

export interface TeamStanding {
  team: number;
  total: number;
  members: { userId: number; name: string; points: number; isMe?: boolean }[];
}

/** Per-team exam points inside the match window (live or final). */
export function competitionTeams(comp: CompetitionRow): TeamStanding[] {
  const to = comp.ends_at && Date.now() > comp.ends_at ? comp.ends_at : Date.now();
  const from = comp.starts_at || comp.created_at;
  const byTeam: Record<number, TeamStanding> = {
    1: { team: 1, total: 0, members: [] },
    2: { team: 2, total: 0, members: [] },
  };
  for (const e of competitionEntries(comp.id)) {
    const points =
      comp.status === "open"
        ? 0
        : Math.round(examPointsInWindow(e.user_id, from, to) * 10) / 10;
    const bucket = byTeam[e.team] ?? byTeam[1]!;
    bucket.members.push({ userId: e.user_id, name: resolveName(getUser(e.user_id), e.user_id), points });
    bucket.total = Math.round((bucket.total + points) * 10) / 10;
  }
  return [byTeam[1]!, byTeam[2]!];
}

/**
 * Settle a running match whose time is up: the team with the most exam points
 * wins and the pot is split among its members; a tie refunds everyone.
 * Returns the winning team (0 = tie/refund) or an error string.
 */
export function settleCompetition(id: string): { winnerTeam: number; each: number } | "not_found" | "bad_state" {
  const db = getDb();
  return db.transaction(() => {
    const comp = getCompetition(id);
    if (!comp) return "not_found" as const;
    if (comp.status !== "running" && comp.status !== "open") return "bad_state" as const;

    const teams = competitionTeams(comp);
    const [a, b] = teams;
    const pot = comp.pot_points;

    // Tie (or nobody scored) → refund every stake, no winner.
    if (!a || !b || a.total === b.total) {
      for (const e of competitionEntries(id)) {
        if (e.stake_paid) postLedger(e.user_id, e.stake_paid, "bet_refund", id);
      }
      db.prepare(`UPDATE competitions SET status = 'settled', winner_team = 0 WHERE id = @id`).run({ id });
      return { winnerTeam: 0, each: 0 };
    }

    const winner = a.total > b.total ? a : b;
    const each = winner.members.length
      ? Math.round((pot / winner.members.length) * 10) / 10
      : 0;
    for (const m of winner.members) {
      postLedger(m.userId, each, "bet_payout", id);
      db.prepare(
        `UPDATE competition_entries SET payout = @p WHERE competition_id = @c AND user_id = @u`,
      ).run({ p: each, c: id, u: m.userId });
    }
    db.prepare(`UPDATE competitions SET status = 'settled', winner_team = @w WHERE id = @id`).run({
      id,
      w: winner.team,
    });
    return { winnerTeam: winner.team, each };
  })();
}

/** Cancel a competition and refund every entrant's stake (admin / abandoned). */
export function cancelCompetition(id: string): boolean {
  const db = getDb();
  return db.transaction(() => {
    const comp = getCompetition(id);
    if (!comp || comp.status === "settled" || comp.status === "cancelled") return false;
    for (const e of competitionEntries(id)) {
      if (e.stake_paid) postLedger(e.user_id, e.stake_paid, "bet_refund", id);
    }
    db.prepare(`UPDATE competitions SET status = 'cancelled' WHERE id = ?`).run(id);
    return true;
  })();
}

/**
 * Auto-settle every running match whose time is up. Called lazily from the API
 * (no cron). Also transitions open → running when starts_at has arrived.
 * Notifies participants via the outbox. Returns settled ids.
 */
export function settleDueCompetitions(): string[] {
  const now = Date.now();
  // Open → running: starts_at has passed (admin-set match start time).
  getDb()
    .prepare(`SELECT id FROM competitions WHERE status = 'open' AND starts_at > 0 AND starts_at <= ?`)
    .all(now)
    .forEach(({ id }: any) => {
      getDb().prepare(`UPDATE competitions SET status = 'running' WHERE id = ?`).run(id);
    });

  const due = getDb()
    .prepare(`SELECT id FROM competitions WHERE status = 'running' AND ends_at > 0 AND ends_at <= ?`)
    .all(now) as { id: string }[];
  const settled: string[] = [];
  for (const { id } of due) {
    const comp = getCompetition(id);
    const res = settleCompetition(id);
    if (typeof res === "object" && comp) {
      settled.push(id);
      for (const e of competitionEntries(id)) {
        const won = res.winnerTeam !== 0 && e.team === res.winnerTeam;
        enqueueOutbox(
          e.user_id,
          res.winnerTeam === 0
            ? `↩️ انتهت مسابقة «${comp.title}» بالتعادل وأُعيدت نقاط رهانك.`
            : won
              ? `🏆 مبروك! فاز فريقك في «${comp.title}» وربحت ${res.each} نقطة!`
              : `😔 انتهت مسابقة «${comp.title}». فاز الفريق الآخر هذه المرة — حظًا أوفر!`,
        );
      }
    }
  }
  return settled;
}

/** A settled/cancelled result the user hasn't seen yet (for the home toast). */
export interface CompetitionResult {
  competitionId: string;
  title: string;
  format: number;
  won: boolean;
  tie: boolean;
  amount: number;
  stake: number;
}

export function takeUnackedResult(userId: number): CompetitionResult | null {
  const row = getDb()
    .prepare(
      `SELECT e.*, c.title AS title, c.format AS format, c.status AS cstatus, c.winner_team AS winner_team
       FROM competition_entries e
       JOIN competitions c ON c.id = e.competition_id
       WHERE e.user_id = ? AND e.acked = 0
         AND c.status IN ('settled','cancelled')
       ORDER BY c.created_at DESC LIMIT 1`,
    )
    .get(userId) as any;
  if (!row) return null;

  getDb()
    .prepare(`UPDATE competition_entries SET acked = 1 WHERE competition_id = @c AND user_id = @u`)
    .run({ c: row.competition_id, u: userId });

  const tie = row.cstatus === "cancelled" || row.winner_team === 0;
  const won = !tie && row.team === row.winner_team;
  return {
    competitionId: row.competition_id,
    title: row.title,
    format: row.format,
    won,
    tie,
    amount: row.payout || 0,
    stake: row.stake_paid || 0,
  };
}

// ─── Outbox (bot delivers these) ────────────────────────────────────────────

export function enqueueOutbox(
  userId: number,
  text: string,
  buttons?: { text: string; url: string }[][] | null,
): void {
  getDb()
    .prepare(
      `INSERT INTO outbox (id, user_id, text, buttons_json, created_at)
       VALUES (@id, @user, @text, @buttons, @at)`,
    )
    .run({
      id: randomUUID(),
      user: userId,
      text,
      buttons: buttons ? JSON.stringify(buttons) : null,
      at: Date.now(),
    });
}

/** Fan a message out to every known user (used for new-exam announcements). */
export function enqueueBroadcast(
  text: string,
  buttons?: { text: string; url: string }[][] | null,
): number {
  const ids = allUserIds();
  const admins = adminIds();
  const targets = ids.filter((id) => !admins.has(id));
  const insert = getDb().prepare(
    `INSERT INTO outbox (id, user_id, text, buttons_json, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const buttonsJson = buttons ? JSON.stringify(buttons) : null;
  const now = Date.now();
  const tx = getDb().transaction(() => {
    for (const id of targets) insert.run(randomUUID(), id, text, buttonsJson, now);
  });
  tx();
  return targets.length;
}

export type { GradingResult };
