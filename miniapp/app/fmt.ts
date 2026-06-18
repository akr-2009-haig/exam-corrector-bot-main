/** Small shared formatting helpers (Arabic-friendly). */

export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

export function fmtPoints(n: number): string {
  return Number(n.toFixed(1)).toLocaleString("en-US");
}

export function fmtScore(awarded: number, max: number): string {
  return `${num(awarded)} / ${num(max)}`;
}

export function pct(awarded: number, max: number): number {
  return max > 0 ? Math.round((awarded / max) * 100) : 0;
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString("ar", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact remaining/elapsed label, e.g. "بعد ٢ ساعة" / "متبقّ ٣٠ دقيقة". */
export function fmtRelative(target: number): string {
  const diff = target - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  let label: string;
  if (mins < 60) label = `${mins} دقيقة`;
  else if (hours < 24) label = `${hours} ساعة`;
  else label = `${days} يوم`;
  return diff >= 0 ? `بعد ${label}` : `منذ ${label}`;
}
