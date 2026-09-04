// Novel: single-file YouTube domain, no shared/modules indirection.
// Fixes old bug: isKaraokePlayUrl false positives, missing youtu.be?si handling, regex sprawl.

export const YOUTUBE_ID_RE = /^[\w-]{11}$/

const YOUTUBE_HOSTS = /(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|^youtu\.be$/i
const MUSIC_HOST = /(^|\.)music\.youtube\.com$/i

export function extractVideoId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  if (YOUTUBE_ID_RE.test(raw)) return raw

  // karaoke play URL
  const playMatch = raw.match(/\/play\/([\w-]{11})(?:[/?#]|$)/)
  if (playMatch) return playMatch[1]

  // youtu.be
  const short = raw.match(/youtu\.be\/([\w-]{11})/)
  if (short) return short[1]

  // embed / shorts / live / v/
  const path = raw.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live|v|e)\/([\w-]{11})/)
  if (path) return path[1]

  // watch?v=
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    const hostOk = YOUTUBE_HOSTS.test(url.hostname) || MUSIC_HOST.test(url.hostname) || url.hostname.includes("song.opsec.rent")
    if (!hostOk && !url.pathname.startsWith("/play") && !url.pathname.startsWith("/watch")) return null
    const v = url.searchParams.get("v")
    if (v && YOUTUBE_ID_RE.test(v)) return v
  } catch { /* not url */ }
  return null
}

export function isValidVideoId(id: string): boolean {
  return YOUTUBE_ID_RE.test(id)
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export function embedUrl(videoId: string, origin: string): string {
  const o = encodeURIComponent(origin)
  // No credentialless unless needed - avoids COEP breakage that blocked old app in cloud VM.
  return `https://www.youtube-nocookie.com/embed/${videoId}?enablejsapi=1&origin=${o}&playsinline=1&rel=0`
}
