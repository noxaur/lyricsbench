// Simplified but robust: strip promos, detect "Artist - Track" vs "Track - Artist" via heuristics.
// Novel vs old: no 348-line file, no per-variant regex explosion; single pass with ranked hints.

const PROMO_RE = /\s*[\(\[][^\)\]]*(official|mv|music video|lyrics|audio|visualizer|cover|remix|ver\.?|version)[^\)\]]*[\)\]]\s*/gi
const FEAT_RE = /\s*[\(\[]?\s*(?:feat\.?|ft\.?)\s+[^\)\]]+[\)\]]?\s*$/i
const CHANNEL_SUFFIX = /\s*-\s*(topic|vevo|official.*|records)\s*$/i

export function stripChannelSuffix(v: string): string {
  return v.replace(CHANNEL_SUFFIX, "").trim()
}

function clean(s: string): string {
  return s
    .replace(PROMO_RE, " ")
    .replace(FEAT_RE, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseTrackTitle(title: string, author?: string): { artist: string; track: string } {
  const raw = title.trim()
  // Handle "「Track」" japanese corner quotes: Artist「Track」
  const corner = raw.match(/^(.+?)「([^」]+)」/)
  if (corner) return { artist: clean(corner[1]), track: clean(corner[2]) }

  // Handle quoted: "Track" by Artist
  const quotedBy = raw.match(/"([^"]+)"\s+by\s+(.+)/i)
  if (quotedBy) return { artist: clean(quotedBy[2]), track: clean(quotedBy[1]) }

  // Normal separators: " - ", " – ", " — ", ": "
  for (const sep of [" - ", " – ", " — ", ": "]) {
    const idx = raw.indexOf(sep)
    if (idx > 0) {
      let left = clean(raw.slice(0, idx))
      let right = clean(raw.slice(idx + sep.length))
      // Heuristic swap: if right matches channel name, left is track
      if (author) {
        const hint = stripChannelSuffix(author).toLowerCase()
        const leftL = left.toLowerCase()
        const rightL = right.toLowerCase()
        if (rightL.includes(hint) || hint.includes(rightL)) {
          // left is track, right is artist -> swap
          return { artist: stripChannelSuffix(right), track: stripChannelSuffix(left) }
        }
        if (leftL.includes(hint) || hint.includes(leftL)) {
          return { artist: stripChannelSuffix(left), track: stripChannelSuffix(right) }
        }
      }
      return { artist: stripChannelSuffix(left), track: stripChannelSuffix(right) }
    }
  }

  // Fallback: topic channel
  if (author) {
    const topic = author.match(/^(.+?)\s*-\s*topic\s*$/i)
    if (topic) return { artist: clean(topic[1]), track: clean(raw) }
  }

  return { artist: author ? stripChannelSuffix(author) : "", track: clean(raw) }
}
