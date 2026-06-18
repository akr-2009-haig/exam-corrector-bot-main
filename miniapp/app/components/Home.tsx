"use client";

/** Home screen: a list of capability cards, role-aware. PUBG × Space theme. */
import { num } from "../fmt";
import type { ViewKey } from "../page";
import { Checklist, Chart, Trophy, Target, UserTactical, Retry, Shield, StarCoin } from "../icons";

interface Card {
  key: ViewKey;
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone: string;
  soon?: boolean;
}

const STUDENT_CARDS: Card[] = [
  { key: "grade", icon: <Checklist size={28}/>, title: "الامتحانات", sub: "شارك في الامتحان وأرسل ورقتك للتصحيح", tone: "c-blue" },
  { key: "results", icon: <Chart size={28}/>, title: "نتائجي", sub: "كل درجاتك وتصحيحاتك", tone: "c-green" },
  { key: "leaderboard", icon: <Trophy size={28}/>, title: "التصنيف", sub: "ترتيب اللاعبين حسب النقاط", tone: "c-gold" },
  { key: "competition", icon: <Target size={28}/>, title: "المسابقات", sub: "راهن بنقاطك واربح الجائزة", tone: "c-purple" },
];

const ADMIN_CARDS: Card[] = [
  { key: "register", icon: <Checklist size={28}/>, title: "تسجيل امتحان", sub: "ارفع مفتاح الإجابة وفعّله", tone: "c-blue" },
  { key: "manage", icon: <Checklist size={28}/>, title: "الامتحانات", sub: "إحصائيات وكشف الدرجات وإيقاف", tone: "c-green" },
  { key: "students", icon: <UserTactical size={28}/>, title: "الطلاب", sub: "درجات كل طالب", tone: "c-cyan" },
  { key: "retakes", icon: <Retry size={28}/>, title: "طلبات الإعادة", sub: "السماح بمحاولة جديدة", tone: "c-orange" },
  { key: "leaderboard", icon: <Trophy size={28}/>, title: "التصنيف", sub: "ترتيب الطلاب", tone: "c-gold" },
  { key: "competition", icon: <Target size={28}/>, title: "المسابقات", sub: "أنشئ وأدر المسابقات", tone: "c-purple" },
];

/** Stable gradient from a name (matches the leaderboard avatar palette). */
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

export default function Home({
  isAdmin,
  name,
  balance,
  photoUrl,
  onNavigate,
}: {
  isAdmin: boolean;
  name: string;
  balance: number;
  photoUrl?: string | null;
  onNavigate: (v: ViewKey) => void;
}) {
  const cards = isAdmin ? ADMIN_CARDS : STUDENT_CARDS;

  return (
    <div className="home">
      {/* ── Player profile hero ── */}
      <div className="home-hero">
        <div className="hero-cover" />
        <div className="hero-avatar-wrap">
          <div className="hero-avatar" style={{ background: photoUrl ? undefined : avatarColor(name) }}>
            {photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photoUrl} alt={name} />
              : (name.trim()[0] || "؟").toUpperCase()
            }
          </div>
          <span className="hero-status" />
        </div>
        <div className="hero-name">{name}</div>
        {isAdmin && (
          <div className="hero-role-badge role-admin">
            <Shield size={14} /> ADMIN
          </div>
        )}
        {!isAdmin && (
          <div className="hero-wallet">
            <span className="hero-wallet-icon"><StarCoin tone="gold" size={24} /></span>
            <span className="hero-wallet-val">{num(balance)}</span>
            <span className="hero-wallet-label">نقطة</span>
          </div>
        )}
      </div>

      {/* ── Vertical tactical card list ── */}
      <div className="cards">
        {cards.map((c, i) => (
          <button
            key={i}
            className={`card ${c.tone}`}
            style={{ animation: `slide-in-up 0.4s ease both`, animationDelay: `${i * 0.08}s` }}
            onClick={() => onNavigate(c.key)}
          >
            <span className="card-icon">{c.icon}</span>
            <span className="card-text">
              <span className="card-title">{c.title}</span>
              <span className="card-sub">{c.sub}</span>
            </span>
            <span className="card-arrow">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
