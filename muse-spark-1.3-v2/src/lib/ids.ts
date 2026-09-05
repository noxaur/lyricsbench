/**
 * YouTube identity: one structured parse, no overlapping regex chain.
 *
 * v2 vs v1: v1 parsed the ID but dropped the start timestamp (?t= / ?start=
 * / #t=). Pasting a timestamped share link then started the song from 0:00
 * while the lyrics assumed the intro — a sync mismatch. v2 extracts the ID
 * AND the start offset together, so /watch and the home action can preserve
 * `?t=` through the redirect into the player, which seeks once ready.
 */

export const VIDEO_ID_RE = /^[\w-]{11}$/;

function asUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    if (/^https?:\/\//i.test(trimmed)) return new URL(trimmed);
    if (/^[\w-]+\.[\w-]+/.test(trimmed)) return new URL(`https://${trimmed}`);
    return null;
  } catch {
    return null;
  }
}

function hostKind(hostname: string): "youtube" | "youtu-be" | null {
  const h = hostname.toLowerCase();
  if (h === "youtu.be") return "youtu-be";
  if (
    h === "youtube.com" ||
    h.endsWith(".youtube.com") ||
    h === "youtube-nocookie.com" ||
    h.endsWith(".youtube-nocookie.com") ||
    h === "music.youtube.com" ||
    h.endsWith(".music.youtube.com")
  ) {
    return "youtube";
  }
  return null;
}

/** Parse "1h2m30s" / "90" / "90s" / "1:30" into seconds. Null when unreadable. */
export function parseTimestampSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const v = Number(s);
    return Number.isFinite(v) && v >= 0 ? Math.min(v, 86399) : null;
  }
  // 1:30 or 1:02:30
  const colon = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colon) {
    const a = Number(colon[1]);
    const b = Number(colon[2]);
    const c = colon[3] === undefined ? null : Number(colon[3]);
    if (c === null) return a * 60 + b;
    return a * 3600 + b * 60 + c;
  }
  // 1h2m30s / 90s / 2m10s
  const hms = s.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s?)?$/);
  if (hms && (hms[1] !== undefined || hms[2] !== undefined || hms[3] !== undefined)) {
    const h = hms[1] === undefined ? 0 : Number(hms[1]);
    const m = hms[2] === undefined ? 0 : Number(hms[2]);
    const sec = hms[3] === undefined || hms[3] === "" ? 0 : Number(hms[3]);
    if (![h, m, sec].every(Number.isFinite)) return null;
    return Math.min(Math.max(0, h * 3600 + m * 60 + sec), 86399);
  }
  return null;
}

function startFromUrl(url: URL): number | null {
  const candidates = [
    url.searchParams.get("t"),
    url.searchParams.get("start"),
    url.hash.match(/(?:[?&#]|^)t=([^&]+)/)?.[1] ?? null,
  ];
  for (const c of candidates) {
    const v = parseTimestampSeconds(c);
    if (v !== null && v > 0) return v;
  }
  return null;
}

export interface VideoRef {
  videoId: string;
  /** Start offset in whole seconds, when the pasted link carried ?t=. */
  startAt: number;
}

/**
 * Extract the video ID plus an optional start offset. Returns null for
 * Spotify links, playlists-only links, and garbage.
 */
export function extractVideoRef(input: string): VideoRef | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (VIDEO_ID_RE.test(trimmed)) return { videoId: trimmed, startAt: 0 };

  const relPlay = trimmed.match(/^\/?play\/([\w-]{11})(?:[/?#]|$)/);
  if (relPlay?.[1]) return { videoId: relPlay[1], startAt: 0 };
  const relWatch = trimmed.match(/^\/?watch\?([^#]*)/);
  if (relWatch?.[1]) {
    const params = new URLSearchParams(relWatch[1]);
    const v = params.get("v");
    if (v && VIDEO_ID_RE.test(v)) {
      const t = parseTimestampSeconds(params.get("t") ?? params.get("start")) ?? 0;
      return { videoId: v, startAt: t };
    }
  }

  const url = asUrl(trimmed);
  if (!url) return null;
  const kind = hostKind(url.hostname);
  if (!kind) {
    const play = url.pathname.match(/\/play\/([\w-]{11})(?:[/?#]|$)/);
    if (play?.[1]) return { videoId: play[1], startAt: 0 };
    if (url.pathname === "/watch") {
      const v = url.searchParams.get("v");
      if (v && VIDEO_ID_RE.test(v)) return { videoId: v, startAt: startFromUrl(url) ?? 0 };
    }
    return null;
  }

  if (kind === "youtu-be") {
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (seg && VIDEO_ID_RE.test(seg)) return { videoId: seg, startAt: startFromUrl(url) ?? 0 };
    return null;
  }

  const path = url.pathname;
  for (const re of [
    /^\/embed\/([\w-]{11})(?:[/?#]|$)/,
    /^\/shorts\/([\w-]{11})(?:[/?#]|$)/,
    /^\/live\/([\w-]{11})(?:[/?#]|$)/,
    /^\/(?:v|e|vi)\/([\w-]{11})(?:[/?#]|$)/,
  ]) {
    const m = path.match(re);
    if (m?.[1]) return { videoId: m[1], startAt: startFromUrl(url) ?? 0 };
  }
  const v = url.searchParams.get("v");
  if (v && VIDEO_ID_RE.test(v)) return { videoId: v, startAt: startFromUrl(url) ?? 0 };
  return null;
}

/** Back-compat single-ID helper used by loaders and actions. */
export function extractVideoId(input: string): string | null {
  return extractVideoRef(input)?.videoId ?? null;
}

export function isSpotifyTrackUrl(input: string): boolean {
  const url = asUrl(input);
  if (!url) return false;
  return (
    /(^|\.)spotify\.com$/i.test(url.hostname) && /\/track\/[A-Za-z0-9]+/.test(url.pathname)
  );
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/** Fetch with a hard timeout so a hung oEmbed never stalls the pipeline. */
async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`oembed ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** oEmbed title/author without any API key. Null on failure or abort. */
export async function fetchOEmbedTitle(
  videoId: string,
  signal?: AbortSignal,
): Promise<{ title: string; author: string } | null> {
  try {
    const data = (await fetchJsonWithTimeout(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl(videoId))}&format=json`,
      7000,
      signal,
    )) as { title?: string; author_name?: string };
    if (typeof data.title !== "string" || !data.title.trim()) return null;
    return {
      title: data.title.trim(),
      author: typeof data.author_name === "string" ? data.author_name.trim() : "",
    };
  } catch {
    return null;
  }
}
