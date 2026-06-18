/**
 * Advanced scoring bonuses (percentage-based, env-tunable).
 *
 *  • Speed bonus — the faster a student answers after an exam is published,
 *    the bigger the bonus (% of their raw score).
 *  • Loyalty bonus — answering several exams in a row (a streak) adds a bonus
 *    (% of their raw score), capped.
 *
 * Bonuses are added to the leaderboard points (via the ledger), NOT to the
 * exam grade shown on the corrected paper.
 */
import { loyaltyStreak } from "./db";

interface SpeedTier {
  withinHours: number;
  pct: number;
}

/** Parse "1:15,3:10,6:5,24:2" → ascending tiers (hours:percent). */
function speedTiers(): SpeedTier[] {
  const raw = process.env.SCORE_SPEED_TIERS || "1:15,3:10,6:5,24:2";
  return raw
    .split(",")
    .map((p) => p.split(":").map((s) => Number(s.trim())))
    .filter(([h, pct]) => Number.isFinite(h) && Number.isFinite(pct))
    .map(([h, pct]) => ({ withinHours: h!, pct: pct! }))
    .sort((a, b) => a.withinHours - b.withinHours);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Speed bonus in POINTS for answering `elapsedMs` after publication. */
export function speedBonus(base: number, submittedAt: number, examCreatedAt: number): {
  points: number;
  pct: number;
} {
  if (base <= 0) return { points: 0, pct: 0 };
  const hours = (submittedAt - examCreatedAt) / 3_600_000;
  let pct = 0;
  for (const tier of speedTiers()) {
    if (hours <= tier.withinHours) {
      pct = tier.pct;
      break;
    }
  }
  return { points: round1((base * pct) / 100), pct };
}

/** Loyalty bonus in POINTS based on the user's current answer streak. */
export function loyaltyBonus(
  base: number,
  userId: number,
  examId: string,
): { points: number; pct: number; streak: number } {
  const step = Number(process.env.SCORE_LOYALTY_STEP ?? 3);
  const cap = Number(process.env.SCORE_LOYALTY_CAP ?? 15);
  const streak = loyaltyStreak(userId, examId);
  const pct = Math.min(Math.max(0, (streak - 1) * step), cap);
  return { points: base <= 0 ? 0 : round1((base * pct) / 100), pct, streak };
}
