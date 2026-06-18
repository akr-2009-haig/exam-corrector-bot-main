"use client";

/** التصنيف — leaderboard view (ledger-backed). Extracted from the old page. */
import { useEffect, useMemo, useState } from "react";
import { api, haptic } from "../tg";
import { fmtPoints } from "../fmt";
import {
  WingMedal,
  StarCoin,
  Trophy,
  TrophyHero,
  Podium,
  Calendar,
  Clock,
  Rocket,
  Bulb,
  Help,
  Muscle,
  Crown,
} from "../icons";
import Loader from "./Loader";

interface RankedEntry {
  rank: number;
  name: string;
  points: number;
  exams: number;
  isMe: boolean;
}
interface PeriodData {
  top: RankedEntry[];
  me: (RankedEntry & { gap: number }) | null;
  total: number;
}
interface Celebration {
  prevRank: number;
  newRank: number;
  pointsGained: number;
  overtook: number;
}
interface ApiResponse {
  periods: { all: PeriodData; week: PeriodData; month: PeriodData };
  celebration: Celebration | null;
  updatedAt: number;
}
type PeriodKey = "all" | "week" | "month";

const TABS: { key: PeriodKey; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "التصنيف العام", icon: <Podium /> },
  { key: "week", label: "هذا الأسبوع", icon: <Calendar dots={1} /> },
  { key: "month", label: "هذا الشهر", icon: <Calendar dots={2} /> },
];

const AVATAR_COLORS = [
  "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#fccb90,#d57eeb)",
  "linear-gradient(135deg,#43e97b,#38f9d7)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#fa709a,#fee140)",
];
function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}
const COIN_TONE: Record<number, "gold" | "silver" | "bronze"> = { 1: "gold", 2: "silver", 3: "bronze" };

function Avatar({ name, me }: { name: string; me?: boolean }) {
  return (
    <div className={`avatar ${me ? "avatar-me" : ""}`} style={{ background: avatarColor(name) }}>
      {(name.trim()[0] || "؟").toUpperCase()}
    </div>
  );
}

const CONFETTI_COLORS = ["#ffd54f", "#ff8a65", "#4fc3f7", "#aed581", "#ba68c8", "#f06292", "#fff176"];

function CelebrationOverlay({ c, onClose }: { c: Celebration; onClose: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.6,
        duration: 2.6 + Math.random() * 1.8,
        size: 7 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        round: Math.random() > 0.5,
      })),
    [],
  );
  const rankImproved = c.newRank < c.prevRank;
  return (
    <div className="cele" onClick={onClose}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 0.45),
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <div className="cele-card">
        <div className="cele-trophy">
          <Trophy size={58} />
        </div>
        <h2 className="cele-heading">
          {rankImproved ? "مبروك! ارتفع ترتيبك 🎉" : "أحسنت! نقاط جديدة ✨"}
        </h2>
        {rankImproved ? (
          <div className="cele-ranks">
            <span className="cele-rank-old">#{c.prevRank}</span>
            <span className="cele-rank-arrow">⬅</span>
            <span className="cele-rank-new">#{c.newRank}</span>
          </div>
        ) : (
          <div className="cele-rank-new cele-rank-solo">#{c.newRank}</div>
        )}
        <div className="cele-chips">
          {c.pointsGained > 0 && <span className="cele-chip chip-gold">+{fmtPoints(c.pointsGained)} نقطة</span>}
          {c.overtook > 0 && (
            <span className="cele-chip chip-blue">
              تجاوزت {c.overtook === 1 ? "طالبًا واحدًا" : `${c.overtook} طلاب`}
            </span>
          )}
        </div>
        <p className="cele-sub">
          {rankImproved ? "استمر على هذا المستوى، القمة أقرب مما تظن!" : "واصل التقدم، ترتيبك يرتفع مع كل نقطة!"}
        </p>
        <button className="cele-btn" onClick={onClose}>
          رائع! 👏
        </button>
      </div>
    </div>
  );
}

function Row({ entry, index }: { entry: RankedEntry; index: number }) {
  const tone = entry.isMe ? "blue" : COIN_TONE[entry.rank];
  return (
    <div
      className={`row ${entry.isMe ? "row-me" : ""} ${
        entry.rank <= 3 && !entry.isMe ? `row-top row-top${entry.rank}` : ""
      }`}
      style={{ animation: `slide-in-up 0.4s ease both`, animationDelay: `${index * 0.05}s` }}
    >
      {entry.rank <= 3 ? (
        <div className="medal-slot">
          <WingMedal rank={entry.rank} />
        </div>
      ) : (
        <div className="medal-slot">
          <div className={`rank-box ${entry.isMe ? "rank-box-me" : ""}`}>{entry.rank}</div>
        </div>
      )}
      <Avatar name={entry.isMe ? "أ" : entry.name} me={entry.isMe} />
      <div className="row-name">
        {entry.isMe ? (
          <>
            <span className="me-label">أنت</span>
            <span className="me-hint">
              استمر، أنت قريب من المراكز الأعلى! <Muscle />
            </span>
          </>
        ) : (
          <span>{entry.name}</span>
        )}
      </div>
      <div className="row-points">
        <div className="pts-line">
          <span className={`pts ${entry.isMe ? "pts-me" : ""}`}>{fmtPoints(entry.points)}</span>
          {tone && <StarCoin tone={tone} />}
        </div>
        <span className="pts-unit">نقطة</span>
      </div>
    </div>
  );
}

/** Modern "your standing" card shown under the list (replaces the 3 stat tiles). */
function MeCard({ period }: { period: PeriodData }) {
  const me = period.me;

  if (!me) {
    return (
      <div className="lb-me lb-me-empty">
        <div className="lb-me-empty-icon">
          <Rocket size={28} />
        </div>
        <div className="lb-me-empty-text">
          <div className="lb-me-empty-h">لم تدخل التصنيف بعد</div>
          <div className="lb-me-empty-p">أرسل إجاباتك في أي امتحان لتظهر هنا!</div>
        </div>
      </div>
    );
  }

  const isLeader = me.rank === 1;
  // Bar fills with the share of points you already hold vs. the player above.
  const nextPts = me.points + me.gap;
  const pct = isLeader
    ? 100
    : Math.min(97, Math.max(6, Math.round((me.points / Math.max(1, nextPts)) * 100)));

  return (
    <div className={`lb-me ${isLeader ? "lb-me-leader" : ""}`}>
      <div className="lb-me-top">
        <div className="lb-me-badge">
          <span className="lb-me-badge-num">#{me.rank}</span>
          <span className="lb-me-badge-lbl">ترتيبك</span>
        </div>
        <div className="lb-me-id">
          <span className="lb-me-name">
            {isLeader ? (
              <>
                <Crown size={16} /> أنت في الصدارة
              </>
            ) : (
              "أنت"
            )}
          </span>
          <span className="lb-me-pts">
            <StarCoin tone={isLeader ? "gold" : "blue"} size={18} />
            {fmtPoints(me.points)} <small>نقطة</small>
          </span>
        </div>
        <div className="lb-me-side">
          <span className="lb-me-side-v">{period.total}</span>
          <span className="lb-me-side-l">لاعب</span>
        </div>
      </div>

      <div className="lb-me-progress">
        <div className="lb-me-bar">
          <div className="lb-me-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="lb-me-progress-lbl">
          {isLeader ? (
            <>
              <Crown size={13} /> أنت على القمة — حافظ على مركزك!
            </>
          ) : (
            <>
              تحتاج <b>{fmtPoints(me.gap)}</b> نقطة لتجاوز المركز {me.rank - 1}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PeriodKey>("all");
  const [showHelp, setShowHelp] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  useEffect(() => {
    api<ApiResponse>("/api/leaderboard")
      .then((api2) => {
        setData(api2);
        if (api2.celebration) {
          setCelebration(api2.celebration);
          haptic("success");
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setCelebration(null), 8000);
    return () => clearTimeout(t);
  }, [celebration]);

  const period = data?.periods[tab];
  const updatedLabel = useMemo(() => {
    if (!data) return "";
    return new Date(data.updatedAt).toLocaleTimeString("ar", { hour: "numeric", minute: "2-digit" });
  }, [data]);

  return (
    <>
      {celebration && <CelebrationOverlay c={celebration} onClose={() => setCelebration(null)} />}

      {/* ── Animated champion hero ── */}
      <header className="lb-hero">
        <div className="lb-hero-trophy">
          <TrophyHero size={86} />
        </div>
        <span className="lb-spark lb-spark-1" />
        <span className="lb-spark lb-spark-2" />
        <span className="lb-spark lb-spark-3" />
        <span className="lb-spark lb-spark-4" />
        <h1 className="lb-hero-title">التصنيف</h1>
        <p className="lb-hero-sub">ترتيب اللاعبين حسب النقاط</p>
      </header>

      <div className="lb-help-row">
        <button className="chip" onClick={() => setShowHelp((v) => !v)}>
          مساعدة <Help />
        </button>
      </div>
      {showHelp && (
        <div className="help">
          نقاطك = مجموع نقاط امتحاناتك + مكافآت السرعة والوفاء + أرباح المسابقات. أجب أسرع وحافظ على
          تتابعك لترفع ترتيبك! 📚
        </div>
      )}

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`tab ${tab === t.key ? "tab-active" : ""}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {error && <div className="state state-error">⚠️ {error}</div>}
      {!error && !data && <Loader />}

      {period && (
        <>
          <div className="updated">
            <Clock /> آخر تحديث: اليوم {updatedLabel}
          </div>
          <section className="list">
            {period.top.length === 0 && <div className="state">لا توجد نتائج في هذه الفترة بعد. كن أول من يتصدّر! 🚀</div>}
            {period.top.map((e, i) => (
              <Row key={e.rank} entry={e} index={i} />
            ))}
          </section>
          <MeCard period={period} />
          <footer className="tip">
            <Bulb /> كلما زادت نقاطك، كلما ارتفع ترتيبك!
          </footer>
        </>
      )}
    </>
  );
}
