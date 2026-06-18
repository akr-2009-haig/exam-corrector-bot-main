/**
 * Inline SVG icon set — game-style (PUBG-like) emblems instead of plain emoji.
 * All icons are pure SVG so they render identically on every device/WebView.
 */

const MEDAL_PALETTE: Record<
  number,
  { light: string; mid: string; dark: string; glow: string; text: string }
> = {
  1: { light: "#ffe082", mid: "#ffb300", dark: "#e65100", glow: "rgba(255,179,0,.6)", text: "#5b3a00" },
  2: { light: "#f5f9ff", mid: "#b6c4d6", dark: "#6d7f96", glow: "rgba(182,196,214,.5)", text: "#2c3a52" },
  3: { light: "#ffd1a1", mid: "#d18445", dark: "#8a4a1f", glow: "rgba(209,132,69,.55)", text: "#4a2400" },
};

/** Winged rank emblem for the top-3 (gold / silver / bronze). */
export function WingMedal({ rank }: { rank: number }) {
  const p = MEDAL_PALETTE[rank]!;
  const g = `medal-g-${rank}`;
  const w = `wing-g-${rank}`;
  return (
    <svg
      width="64"
      height="46"
      viewBox="0 0 64 46"
      style={{ filter: `drop-shadow(0 0 7px ${p.glow})` }}
      aria-label={`المركز ${rank}`}
    >
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.light} />
          <stop offset="0.55" stopColor={p.mid} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
        <linearGradient id={w} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.mid} />
          <stop offset="1" stopColor={p.dark} />
        </linearGradient>
      </defs>
      {/* wings — three feather strokes each side */}
      <path
        d="M24 22 C18 10 9 6 2 7 C6 11 7 14 5 17 C10 18 12 20 11 24 C15 25 19 25 24 22 Z"
        fill={`url(#${w})`}
      />
      <path
        d="M40 22 C46 10 55 6 62 7 C58 11 57 14 59 17 C54 18 52 20 53 24 C49 25 45 25 40 22 Z"
        fill={`url(#${w})`}
      />
      {/* crown for #1 */}
      {rank === 1 && (
        <path
          d="M25 7 L28 3.5 L32 6.5 L36 3.5 L39 7 L37.5 9.5 L26.5 9.5 Z"
          fill="#ffd54f"
          stroke="#e65100"
          strokeWidth="0.8"
        />
      )}
      {/* shield */}
      <path
        d="M32 9 L43 13.5 V25 C43 33.5 38.3 39.5 32 43 C25.7 39.5 21 33.5 21 25 V13.5 Z"
        fill={`url(#${g})`}
        stroke={p.dark}
        strokeWidth="1.2"
      />
      <path
        d="M32 12 L40.5 15.5 V25 C40.5 31.8 36.9 36.8 32 39.8 C27.1 36.8 23.5 31.8 23.5 25 V15.5 Z"
        fill="none"
        stroke={p.light}
        strokeWidth="0.9"
        opacity="0.7"
      />
      <text
        x="32"
        y="31"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
        fill={p.text}
      >
        {rank}
      </text>
    </svg>
  );
}

const COIN_TONES: Record<string, { a: string; b: string; rim: string }> = {
  gold: { a: "#ffe082", b: "#ff9800", rim: "#b86c00" },
  silver: { a: "#f0f5fc", b: "#9fb2c8", rim: "#5f7188" },
  bronze: { a: "#ffcc9c", b: "#c87137", rim: "#7e421a" },
  blue: { a: "#9ecbff", b: "#2f80ff", rim: "#1b5cc4" },
};

/** Star coin shown next to the points value. */
export function StarCoin({
  tone = "gold",
  size = 20,
}: {
  tone?: keyof typeof COIN_TONES;
  size?: number;
}) {
  const t = COIN_TONES[tone]!;
  const id = `coin-${tone}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <radialGradient id={id} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={t.a} />
          <stop offset="1" stopColor={t.b} />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${id})`} stroke={t.rim} strokeWidth="1.4" />
      <path
        d="M12 5.6 L13.9 9.5 L18.2 10.1 L15.1 13.1 L15.8 17.4 L12 15.4 L8.2 17.4 L8.9 13.1 L5.8 10.1 L10.1 9.5 Z"
        fill="#fffdf2"
        opacity="0.95"
      />
    </svg>
  );
}

/** Gold trophy for the page title. */
export function Trophy({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden
      style={{ filter: "drop-shadow(0 0 6px rgba(255,179,0,.45))" }}>
      <defs>
        <linearGradient id="tro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe082" />
          <stop offset="1" stopColor="#ff8f00" />
        </linearGradient>
      </defs>
      <path
        d="M7 3h10v2h3v3c0 2.2-1.8 4-4 4h-.3A5 5 0 0 1 13 14.9V17h3v3H8v-3h3v-2.1A5 5 0 0 1 8.3 12H8c-2.2 0-4-1.8-4-4V5h3V3Zm-1 4v1c0 1.1.9 2 2 2V7H6Zm12 0h-2v3c1.1 0 2-.9 2-2V7Z"
        fill="url(#tro)"
        stroke="#a85d00"
        strokeWidth="0.5"
      />
    </svg>
  );
}

/** Large, detailed champion trophy for the leaderboard hero. */
export function TrophyHero({ size = 88 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="th-cup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1b8" />
          <stop offset="0.45" stopColor="#ffc233" />
          <stop offset="1" stopColor="#e67e00" />
        </linearGradient>
        <linearGradient id="th-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffcf52" />
          <stop offset="1" stopColor="#b85c00" />
        </linearGradient>
        <radialGradient id="th-shine" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fffef5" stopOpacity="0.95" />
          <stop offset="1" stopColor="#fffef5" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* handles */}
      <path d="M17 15 C4 15 4 31 19 32" fill="none" stroke="#d98a00" strokeWidth="4" strokeLinecap="round" />
      <path d="M47 15 C60 15 60 31 45 32" fill="none" stroke="#d98a00" strokeWidth="4" strokeLinecap="round" />
      {/* cup bowl */}
      <path d="M15 13 H49 V21 C49 33 41 40 32 40 C23 40 15 33 15 21 Z" fill="url(#th-cup)" stroke="#b85c00" strokeWidth="1.2" strokeLinejoin="round" />
      {/* rim */}
      <rect x="13" y="9.5" width="38" height="5.5" rx="2.5" fill="#ffe08a" stroke="#b85c00" strokeWidth="1" />
      {/* stem */}
      <rect x="29" y="39.5" width="6" height="7" fill="url(#th-base)" />
      {/* base tiers */}
      <rect x="22" y="46" width="20" height="5" rx="2" fill="url(#th-base)" />
      <rect x="17" y="51" width="30" height="6.5" rx="3" fill="url(#th-base)" stroke="#b85c00" strokeWidth="1" />
      {/* star emblem */}
      <path d="M32 19 L34.2 24 L39.6 24.5 L35.5 28 L36.8 33.3 L32 30.4 L27.2 33.3 L28.5 28 L24.4 24.5 L29.8 24 Z" fill="#fffdf2" opacity="0.92" />
      {/* glossy shine */}
      <ellipse cx="24" cy="20" rx="5.5" ry="9" fill="url(#th-shine)" />
    </svg>
  );
}

/** Podium icon (overall tab). */
export function Podium({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="9" y="6" width="6" height="14" rx="1" fill="currentColor" />
      <rect x="2" y="11" width="6" height="9" rx="1" fill="currentColor" opacity="0.75" />
      <rect x="16" y="13" width="6" height="7" rx="1" fill="currentColor" opacity="0.6" />
      <path d="M12 1.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 3.8 11 3.5Z" fill="currentColor" />
    </svg>
  );
}

/** Calendar icon (week / month tabs). */
export function Calendar({ size = 15, dots = 1 }: { size?: number; dots?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 9.5h18" stroke="currentColor" strokeWidth="2" />
      <path d="M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {dots >= 1 && <rect x="7" y="12.5" width="3.4" height="3.4" rx="0.8" fill="currentColor" />}
      {dots >= 2 && <rect x="13.5" y="12.5" width="3.4" height="3.4" rx="0.8" fill="currentColor" opacity="0.7" />}
    </svg>
  );
}

/** Small clock for the "last updated" line. */
export function Clock({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v5.2l3.6 2.1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Bar chart — "your points" card. */
export function Bars({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="5" cy="4" r="2" fill="#a78bfa" />
      <rect x="3.5" y="13" width="4" height="8" rx="1.4" fill="#a78bfa" opacity="0.65" />
      <rect x="10" y="9" width="4" height="12" rx="1.4" fill="#a78bfa" opacity="0.85" />
      <rect x="16.5" y="5" width="4" height="16" rx="1.4" fill="#a78bfa" />
    </svg>
  );
}

/** Trending-up arrow — "your rank" card. */
export function Trend({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M3 17l5.5-5.5 3.5 3.5L20 7"
        fill="none"
        stroke="#4ade80"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14.5 7H20v5.5" fill="none" stroke="#4ade80" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="11.5" r="1.6" fill="#4ade80" />
    </svg>
  );
}

/** Up-right rocket arrow — "points needed" card. */
export function Rocket({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M5 19L17 7"
        stroke="#fb923c"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M10 6.5H17.5V14" fill="none" stroke="#fb923c" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.2 20.2l2.2-.6-1.6-1.6Z" fill="#fb923c" />
    </svg>
  );
}

/** Light bulb for the footer tip. */
export function Bulb({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z"
        fill="#ffd54f"
        stroke="#b8860b"
        strokeWidth="0.8"
      />
      <path d="M9.5 19.5h5M10.5 21.5h3" stroke="#8fa3c4" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Question-mark badge for the help chip. */
export function Help({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M9.4 9.2a2.8 2.8 0 1 1 4.2 2.6c-.9.55-1.6 1-1.6 2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17.4" r="1.3" fill="currentColor" />
    </svg>
  );
}

/** Flexed-arm strength badge for the "you" row hint. */
export function Muscle({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M7 4h4l1.5 5.5c2.8-1.6 6.5-.8 7.8 1.8 1.4 2.8.2 6-2.8 7.2-4 1.6-10.3 1.6-13-1.2C2.7 15.5 3.5 7.5 7 4Z"
        fill="#f6c177"
        stroke="#a8722e"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/** Crown for the leader's stats card. */
export function Crown({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden
      style={{ filter: "drop-shadow(0 0 5px rgba(255,213,79,.5))" }}>
      <path
        d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1.8 10H4.8Z"
        fill="#ffd54f"
        stroke="#b8860b"
        strokeWidth="1"
      />
      <circle cx="3" cy="7" r="1.5" fill="#ffd54f" />
      <circle cx="21" cy="7" r="1.5" fill="#ffd54f" />
      <circle cx="12" cy="4" r="1.5" fill="#ffd54f" />
    </svg>
  );
}

/* ─── New PUBG/Cinematic Icons ───────────────────────────────────────────── */

export function Target({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.8"/>
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function Checklist({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M14 2v6h6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function Chart({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M3 20h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function UserTactical({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

export function Retry({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M21.5 2v6h-6M21.3 15.5a9 9 0 1 1-2.1-10.6l4.6 3.1" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Swords({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M14.5 17.5L3 6l4-4 11.5 11.5M13 19l4 4 4-4-4-4M17.5 14.5L6 3 2 7l11.5 11.5M11 5L5 11M19 13l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Play({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
    </svg>
  );
}

export function Unlock({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function Plus({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function Handshake({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M8.5 14.5L12 18l5-5-3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.5 11.5L19 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 11l7-7 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" />
      <circle cx="6.5" cy="17.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function Undo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M3 10h11a5 5 0 0 1 5 5 5 5 0 0 1-5 5H10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 6L3 10l4 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Check({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Shield({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Fire({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2c0 0-5 6-5 11a5 5 0 0 0 10 0c0-5-5-11-5-11z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 11c-1.5 2-1 4.5 1 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Camera({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

export function Clipboard({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="none" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

export function Alert({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function Settings({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.8 1 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Stop({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
      <rect x="9" y="9" width="6" height="6" fill="currentColor"/>
    </svg>
  );
}

export function Lightning({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>
    </svg>
  );
}

export function Refresh({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Mail({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="22,6 12,13 2,6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function Bell({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
