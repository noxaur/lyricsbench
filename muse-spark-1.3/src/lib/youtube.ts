/**
 * YouTube identity helpers.
 *
 * Novel approach vs the previous generation: instead of ~9 overlapping
 * regexes tried in sequence (which drifted — e.g. karaoke URLs matching as
 * YouTube URLs and vice versa), this module does ONE structured parse:
 * URL → { host, path, query } → match. Bare IDs are the only regex path.
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

function hostKind(hostname: string): "youtube" | "youtu-be" | "music" | null {
  const h = hostname.toLowerCase();
  if (h === "youtu.be") return "youtu-be";
  if (h === "music.youtube.com" || h.endsWith(".music.youtube.com")) return "music";
  if (
    h === "youtube.com" ||
    h.endsWith(".youtube.com") ||
    h === "youtube-nocookie.com" ||
    h.endsWith(".youtube-nocookie.com")
  ) {
    return "youtube";
  }
  return null;
}

/**
 * Extract an 11-char YouTube video ID from share URLs or a bare ID.
 * Returns null for Spotify links, playlists-only links, and garbage —
 * callers turn null into a single "invalid input" message.
 */
export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (VIDEO_ID_RE.test(trimmed)) return trimmed;

  // Relative app links: /play/ID or /watch?v=ID
  const relPlay = trimmed.match(/^\/?play\/([\w-]{11})(?:[/?#]|$)/);
  if (relPlay?.[1]) return relPlay[1];
  const relWatch = trimmed.match(/^\/?watch\?[^#]*\bv=([\w-]{11})(?:&|#|$)/);
  if (relWatch?.[1]) return relWatch[1];

  const url = asUrl(trimmed);
  if (!url) return null;
  const kind = hostKind(url.hostname);
  if (!kind) {
    // Unknown hosts (e.g. song.opsec.rent) may still carry /play/ID or ?v=ID.
    const play = url.pathname.match(/\/play\/([\w-]{11})(?:[/?#]|$)/);
    if (play?.[1]) return play[1];
    const v = url.searchParams.get("v");
    if (v && VIDEO_ID_RE.test(v) && url.pathname === "/watch") return v;
    return null;
  }

  if (kind === "youtu-be") {
    const seg = url.pathname.split("/").filter(Boolean)[0];
    return seg && VIDEO_ID_RE.test(seg) ? seg : null;
  }

  // youtube / music / nocookie share the same path conventions
  const path = url.pathname;
  for (const re of [
    /^\/embed\/([\w-]{11})(?:[/?#]|$)/,
    /^\/shorts\/([\w-]{11})(?:[/?#]|$)/,
    /^\/live\/([\w-]{11})(?:[/?#]|$)/,
    /^\/(?:v|e|vi)\/([\w-]{11})(?:[/?#]|$)/,
  ]) {
    const m = path.match(re);
    if (m?.[1]) return m[1];
  }
  const v = url.searchParams.get("v");
  return v && VIDEO_ID_RE.test(v) ? v : null;
}

export function isSpotifyTrackUrl(input: string): boolean {
  try {
    const url = asUrl(input);
    if (!url) return false;
    return (
      /(^|\.)spotify\.com$/i.test(url.hostname) &&
      /\/track\/[A-Za-z0-9]+/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function embedUrl(videoId: string, origin: string): string {
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    origin,
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/** oEmbed author/title without any API key. Aborts cleanly; null on failure. */
export async function fetchOEmbedTitle(
  videoId: string,
  signal?: AbortSignal,
): Promise<{ title: string; author: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl(videoId))}&format=json`,
      signal ? { signal } : undefined,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    if (typeof data.title !== "string" || !data.title.trim()) return null;
    return {
      title: data.title.trim(),
      author: typeof data.author_name === "string" ? data.author_name.trim() : "",
    };
  } catch {
    return null;
  }
}
