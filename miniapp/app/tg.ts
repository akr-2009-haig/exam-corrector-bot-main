"use client";

/** Thin helpers around the Telegram WebApp bridge + an API fetch wrapper. */

export function tg(): any {
  return typeof window !== "undefined" ? (window as any).Telegram?.WebApp : undefined;
}

export function initData(): string {
  return tg()?.initData || "";
}

export function haptic(kind: "success" | "warning" | "error" = "success"): void {
  try {
    tg()?.HapticFeedback?.notificationOccurred?.(kind);
  } catch {
    /* unsupported */
  }
}

export function closeApp(): void {
  tg()?.close?.();
}

/** Initialise the WebView: ready/expand and (when supported) fullscreen. */
export function setupViewport(): void {
  const t = tg();
  t?.ready?.();
  t?.expand?.();
  // Request fullscreen (Bot API 8.0+). Fullscreen fills the screen on tablets
  // (iPad) AND removes Telegram's windowed "إلغاء/✕" title bar, leaving only a
  // small floating close icon (Telegram-native, cannot be removed).
  try {
    if (t?.isVersionAtLeast?.("8.0") && !t.isFullscreen) t.requestFullscreen?.();
  } catch {
    /* not supported on this client */
  }
}

/** Fetch a JSON API route, attaching the signed initData header. */
export async function api<T = any>(
  path: string,
  opts: { method?: string; body?: any; raw?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { "x-init-data": initData() };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(path + (path.includes("?") ? "" : window.location.search), {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers,
    body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "تعذّر تنفيذ العملية");
  return data as T;
}
