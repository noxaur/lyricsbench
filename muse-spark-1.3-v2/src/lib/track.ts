/**
 * Video title → { artist, track } as an ordered pipeline.
 *
 * v2 vs v1: v1 split on the FIRST dash and stripped promo text with one
 * regex. It mis-split titles like "Artist - Track - Live at X" (kept the
 * venue in the track) and "Track (by Artist)". v2 tokenizes ALL dash-like
 * separators (hyphen, en/em dash, fullwidth tilde), understands "X by Y"
 * and "Artist: Track" shapes, and removes venue tails ("- Live at…",
 * "- Royal Albert Hall…") before assigning sides.
 */

export interface TrackGuess {
  artist: string;
  track: string;
}

const TOPIC_SUFFIX = /\s*-\s*topic\s*$/i;
const PROMO_PAREN =
  /\s*[\(\[][^()\[\]]*(official|lyric|audio|video|visualizer|visualiser|mv|m\/v|performance|live|cover|remix|ver\.|version|theme|ost|amv|karaoke|with lyrics|slowed|sped ?up|reverb)[^()\[\]]*[\)\]]\s*/gi;
const VENUE_TAIL =
  /\s*[–—-]\s*(live at .+|live from .+|live in .+|at .+ (hall|arena|stadium|theatre|theater|festival|tour)|royal albert hall.+|tiny desk.+|bbc .+|vevo.+)$/i;
const BY_PATTERN = /^(.*?)\s+\(by\s+([^)]+)\)\s*$/i;
const COLON_SPLIT = /^\s*([^:｜|]+?)\s*[:｜|]\s*(.+?)\s*$/;

function cleanToken(s: string): string {
  return s
    .replace(/【[^】]*】/g, " ")
    .replace(/「[^」]*」/g, " ")
    .replace(/『[^』]*』/g, " ")
    .replace(PROMO_PAREN, " ")
    .replace(/\s*\|\s*.*$/, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripFeat(s: string): string {
  return s
    .replace(/\s*[\(\[]?\s*(?:feat\.?|ft\.?|featuring|with)\s+[^)\]]+[)\]]?\s*$/i, "")
    .trim();
}

const DASH_SPLIT = /\s*(?:-(?!\d)|–|—|～|〜|~)\s*/;

/**
 * Guess artist/track from a YouTube title plus optional channel author.
 * Prefers the oEmbed author when it matches one side; else left = artist.
 */
export function guessTrack(title: string, author = ""): TrackGuess {
  const channelArtist = author.replace(TOPIC_SUFFIX, "").trim();
  let working = cleanToken(title).replace(VENUE_TAIL, " ").replace(/\s+/g, " ").trim();

  const by = working.match(BY_PATTERN);
  if (by?.[1] && by?.[2]) {
    return { artist: cleanToken(by[2]), track: stripFeat(cleanToken(by[1])) };
  }

  const parts = working.split(DASH_SPLIT).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0] as string;
    const rest = parts.slice(1).join(" - ").trim();
    const l = cleanToken(first);
    const r = stripFeat(cleanToken(rest));
    if (channelArtist) {
      const norm = (s: string) => s.toLowerCase();
      if (norm(r).includes(norm(channelArtist)) || norm(channelArtist).includes(norm(r))) {
        return { artist: channelArtist, track: stripFeat(l) };
      }
      if (norm(l).includes(norm(channelArtist)) || norm(channelArtist).includes(norm(l))) {
        return { artist: channelArtist, track: r };
      }
    }
    return { artist: l, track: r };
  }

  const colon = working.match(COLON_SPLIT);
  if (colon?.[1] && colon?.[2]) {
    const l = cleanToken(colon[1]);
    const r = stripFeat(cleanToken(colon[2]));
    if (channelArtist) {
      const norm = (s: string) => s.toLowerCase();
      if (norm(l).includes(norm(channelArtist)) || norm(channelArtist).includes(norm(l))) {
        return { artist: channelArtist, track: r };
      }
    }
    if (l.length <= 40 && r.length > 0) return { artist: l, track: r };
  }

  const single = stripFeat(working);
  if (channelArtist && single) return { artist: channelArtist, track: single };
  return { artist: "", track: single };
}

/** Ordered LRCLIB query strategies: exact → simplified → track-only → swapped. */
export function searchQueries(guess: TrackGuess): Array<{ track: string; artist: string }> {
  const out: Array<{ track: string; artist: string }> = [];
  const seen = new Set<string>();
  const push = (track: string, artist: string) => {
    const t = track.trim();
    const a = artist.trim();
    if (!t) return;
    const key = `${t.toLowerCase()}\0${a.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ track: t, artist: a });
  };
  push(guess.track, guess.artist);
  const firstWord = guess.artist.split(/\s+/)[0] ?? "";
  if (firstWord && firstWord !== guess.artist) push(guess.track, firstWord);
  push(guess.track, "");
  if (guess.artist && guess.track.toLowerCase() !== guess.artist.toLowerCase()) {
    push(guess.artist, guess.track);
  }
  return out;
}

/** Token Jaccard overlap 0..1 used by the LRCLIB ranker. */
export function tokenOverlap(a: string, b: string): number {
  const toks = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]+/gi) ?? []);
  const sa = toks(a);
  const sb = toks(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / Math.max(sa.size, sb.size);
}
