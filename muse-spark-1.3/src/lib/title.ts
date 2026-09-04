/**
 * "Video title → artist / track" as an ordered pipeline.
 *
 * Previous generation smeared this across parse-track-title.ts,
 * metadata-lyrics-fallback.ts and track-metadata-resolver.ts with
 * overlapping regexes. Here it is one pass: split → clean → assign.
 */

export interface TrackGuess {
  artist: string;
  track: string;
}

const PROMO_PAREN = /\s*[\(\[][^()\[\]]*(official|lyric|audio|video|visualizer|mv|m\/v|performance|live|cover|remix|ver\.|version|theme|ost|amv)[^()\[\]]*[\)\]]\s*/gi;
const FEAT = /\s*[\(\[]?\s*(?:feat\.?|ft\.?|featuring)\s+[^)\]]+[)\]]?\s*$/i;
const TOPIC_SUFFIX = /\s*-\s*topic\s*$/i;
const DASH_SPLIT = /\s*[–—-]\s*/;

function cleanToken(s: string): string {
  return s
    .replace(/【[^】]*】/g, " ")
    .replace(/「[^」]*」/g, " ")
    .replace(PROMO_PAREN, " ")
    .replace(/\|.*$/, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Guess artist/track from a YouTube title plus optional channel author.
 * Handles "Artist - Track", "Track - Artist" ambiguity by preferring the
 * oEmbed author when it matches one side, else "left = artist".
 */
export function guessTrack(title: string, author = ""): TrackGuess {
  const channelArtist = author.replace(TOPIC_SUFFIX, "").trim();
  const clean = cleanToken(title);
  const parts = clean.split(DASH_SPLIT).map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    const [left, ...rest] = parts as [string, ...string[]];
    const right = rest.join(" - ").replace(FEAT, "").trim();
    const l = cleanToken(left);
    const r = cleanToken(right);
    if (channelArtist) {
      const norm = (s: string) => s.toLowerCase();
      if (norm(r).includes(norm(channelArtist)) || norm(channelArtist).includes(norm(r))) {
        return { artist: channelArtist, track: l };
      }
      if (norm(l).includes(norm(channelArtist)) || norm(channelArtist).includes(norm(l))) {
        return { artist: channelArtist, track: r };
      }
    }
    return { artist: l, track: r };
  }

  const single = clean.replace(FEAT, "").trim();
  if (channelArtist && single) return { artist: channelArtist, track: single };
  return { artist: "", track: single };
}

/** Ordered query strategies for LRCLIB: exact → simplified → swapped. */
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
  push(guess.track.replace(FEAT, "").trim(), guess.artist.split(" ")[0] ?? guess.artist);
  if (guess.artist && guess.track.toLowerCase() !== guess.artist.toLowerCase()) {
    push(guess.artist, guess.track); // track/artist swap catches mislabeled uploads
  }
  return out;
}
