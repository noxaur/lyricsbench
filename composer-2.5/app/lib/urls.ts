export const YOUTUBE_VIDEO_ID_RE = /^[\w-]{11}$/
export const SPOTIFY_TRACK_ID_RE = /^[A-Za-z0-9]{22}$/

const YOUTUBE_HOST_RE = /(^|\.)youtube(-nocookie)?\.com$|(^|\.)youtu\.be$|(^|\.)music\.youtube\.com$/i

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (YOUTUBE_VIDEO_ID_RE.test(trimmed)) return trimmed

  const play = trimmed.match(/\/play\/([\w-]{11})(?:[/?#]|$)/)
  if (play?.[1]) return play[1]

  const path = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed|shorts|live|v|e|vi)\/|music\.youtube\.com\/(?:embed|shorts)\/)([\w-]{11})/,
  )
  if (path?.[1]) return path[1]

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    const v = url.searchParams.get("v")
    if (v && YOUTUBE_VIDEO_ID_RE.test(v)) {
      if (YOUTUBE_HOST_RE.test(url.hostname) || url.pathname === "/watch") return v
    }
  } catch {
    // not a URL
  }

  const watch = trimmed.match(/[?&]v=([\w-]{11})(?:&|#|$)/)
  return watch?.[1] ?? null
}

export function extractSpotifyTrackId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const uri = trimmed.match(/^spotify:track:([A-Za-z0-9]{22})$/i)
  if (uri?.[1]) return uri[1]

  const path = trimmed.match(/\/track\/([A-Za-z0-9]{22})(?:[/?#]|$)/)
  if (path?.[1]) return path[1]

  if (SPOTIFY_TRACK_ID_RE.test(trimmed)) return trimmed
  return null
}

export function isYouTubeUrl(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed || YOUTUBE_VIDEO_ID_RE.test(trimmed)) return false
  return /youtube|youtu\.be/i.test(trimmed) && extractYouTubeVideoId(trimmed) !== null
}

export function isSpotifyTrackUrl(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed || SPOTIFY_TRACK_ID_RE.test(trimmed)) return false
  return extractSpotifyTrackId(trimmed) !== null
}

export function classifyInput(input: string): "youtube" | "spotify" | "query" {
  if (extractYouTubeVideoId(input) && (isYouTubeUrl(input) || YOUTUBE_VIDEO_ID_RE.test(input.trim()))) {
    return "youtube"
  }
  if (extractSpotifyTrackId(input)) return "spotify"
  return "query"
}
