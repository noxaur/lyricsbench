const PAREN_SUFFIX_RE = /\s*[\(\[][^\)\]]*[\)\]]\s*/g
const FULLWIDTH_BRACKET_RE = /\s*【[^】]*】\s*/g
const FULLWIDTH_PAREN_RE = /\s*（[^）]*）\s*/g
const CORNER_QUOTE_RE = /\s*「[^」]*」\s*/g
const CJK_RE = /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/
const CHANNEL_SUFFIX_RE = /\s*-\s*(?:topic|vevo|records|official\s+channel)\s*$/i
const TRAILING_PROMO_RE =
  /\s+(?:music\s+video|official\s+(?:music\s+)?video|lyrics?\s+video|lyric\s+video|audio|visualizer|mv|amv|mad)\s*$/i
const LEADING_PROMO_RE = /^(?:【[^】]*】|「[^」]*」|\([^)]*\)|\[[^\]]*\])+\s*/i
const FEAT_RE = /\s*[\(\[]?\s*(?:feat\.?|ft\.?|featuring)\s+[^\)\]]+[\)\]]?\s*$/i
const REMIX_RE =
  /\s*[\(\[]?\s*\b(?:remix|mix|ver\.|version|edit|instrumental)\b[^\)\]]*[\)\]]?\s*$/i
const TRACK_ARTIST_MARKERS =
  /\b(original|official|mv|lyrics|video|live|cover|full ver|anime|audio)\b|歌詞|ミュージックビデオ/i

export function stripChannelSuffix(value: string): string {
  return value
    .replace(CHANNEL_SUFFIX_RE, "")
    .replace(/\s+official\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function extractTopicArtist(author?: string): string | null {
  if (!author?.trim()) return null
  const match = author.trim().match(/^(.+?)\s*-\s*topic$/i)
  return match?.[1]?.trim() || null
}

export function stripDecorativeTitle(title: string): string {
  let cleaned = title
    .replace(/\s*-\s*topic\s*$/i, " ")
    .replace(FULLWIDTH_BRACKET_RE, " ")
    .replace(FULLWIDTH_PAREN_RE, " ")
    .replace(CORNER_QUOTE_RE, " ")
    .replace(PAREN_SUFFIX_RE, " ")
    .replace(/\|/g, " ")
    .replace(TRAILING_PROMO_RE, " ")
    .replace(/\s+/g, " ")
    .trim()

  while (LEADING_PROMO_RE.test(cleaned)) {
    cleaned = cleaned.replace(LEADING_PROMO_RE, "").trim()
  }
  return stripChannelSuffix(cleaned)
}

export function simplifyTrackName(track: string): string {
  return stripChannelSuffix(
    track.replace(FEAT_RE, "").replace(REMIX_RE, "").replace(TRAILING_PROMO_RE, ""),
  )
}

function swapIfNeeded(left: string, right: string, original: string, author?: string): boolean {
  if (TRACK_ARTIST_MARKERS.test(original.slice(0, original.indexOf(left) + left.length))) {
    return true
  }
  if (CJK_RE.test(left) && CJK_RE.test(right)) return true
  if (!author?.trim()) return false
  const hint = stripChannelSuffix(author).toLowerCase()
  const rightNorm = stripChannelSuffix(right).toLowerCase()
  return Boolean(hint) && (rightNorm.includes(hint) || hint.includes(rightNorm))
}

function finalize(artist: string, track: string, author?: string) {
  let nextArtist = stripChannelSuffix(simplifyTrackName(artist))
  const nextTrack = stripChannelSuffix(simplifyTrackName(track))
  if (!nextArtist.trim()) {
    nextArtist = extractTopicArtist(author) ?? (author ? stripChannelSuffix(author) : "")
  }
  return { artist: nextArtist, track: nextTrack }
}

export function parseTrackTitle(title: string, oembedAuthor?: string): { artist: string; track: string } {
  const corner = title.match(/^(.+?)「([^」]+)」/)
  if (corner?.[1]?.trim() && corner[2]?.trim()) {
    return finalize(corner[1], corner[2], oembedAuthor)
  }

  const quotedBy = title.match(/"([^"]+)"\s+by\s+(.+)/i)
  if (quotedBy) return finalize(quotedBy[2], quotedBy[1], oembedAuthor)

  const cleaned = stripDecorativeTitle(title)
  for (const sep of [" - ", " – ", " — ", ": "]) {
    const idx = cleaned.indexOf(sep)
    if (idx <= 0) continue
    let artist = cleaned.slice(0, idx).trim()
    let track = cleaned.slice(idx + sep.length).trim()
    if (swapIfNeeded(artist, track, title, oembedAuthor)) {
      ;[artist, track] = [track, artist]
    }
    return finalize(artist, track, oembedAuthor)
  }

  return finalize("", simplifyTrackName(cleaned), oembedAuthor)
}

export function parseTrackTitleCandidates(
  title: string,
  oembedAuthor?: string,
): Array<{ artist: string; track: string }> {
  const out: Array<{ artist: string; track: string }> = []
  const seen = new Set<string>()
  const add = (artist: string, track: string) => {
    const a = artist.trim()
    const t = track.trim()
    if (!t) return
    const key = `${a.toLowerCase()}\0${t.toLowerCase()}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ artist: a, track: t })
  }

  const primary = parseTrackTitle(title, oembedAuthor)
  add(primary.artist, primary.track)
  if (primary.artist && primary.track) add(primary.track, primary.artist)

  const topic = extractTopicArtist(oembedAuthor)
  if (topic && primary.track) add(topic, primary.track)
  if (oembedAuthor && primary.track) add(stripChannelSuffix(oembedAuthor), primary.track)

  return out
}
