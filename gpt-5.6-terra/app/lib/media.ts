const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/

export type MediaInput =
  | { kind: "youtube"; videoId: string }
  | { kind: "spotify"; trackId: string }
  | { kind: "query"; query: string }
  | { kind: "invalid" }

export function isYouTubeId(value: string | undefined): value is string {
  return Boolean(value && YOUTUBE_ID.test(value))
}

export function parseMediaInput(raw: string): MediaInput {
  const value = raw.trim()
  if (!value) return { kind: "invalid" }
  if (YOUTUBE_ID.test(value)) return { kind: "youtube", videoId: value }
  const spotifyUri = value.match(/^spotify:track:([A-Za-z0-9]{22})$/i)
  if (spotifyUri) return { kind: "spotify", trackId: spotifyUri[1] }

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`)
    const host = url.hostname.replace(/^www\./, "").toLowerCase()
    const parts = url.pathname.split("/").filter(Boolean)
    let videoId: string | null = null
    if (host === "youtu.be") videoId = parts[0] ?? null
    if (host.endsWith("youtube.com")) {
      videoId = url.searchParams.get("v")
      if (!videoId && ["embed", "shorts", "live"].includes(parts[0] ?? "")) videoId = parts[1] ?? null
    }
    if (videoId && isYouTubeId(videoId)) return { kind: "youtube", videoId }

    if (host.endsWith("spotify.com") && parts[0] === "track" && SPOTIFY_ID.test(parts[1] ?? "")) {
      return { kind: "spotify", trackId: parts[1] }
    }
  } catch {
    // A normal song title is a useful search query, not an error.
  }

  if (value.length >= 2) return { kind: "query", query: value }
  return { kind: "invalid" }
}

export function videoThumbnail(videoId: string, quality: "mq" | "hq" = "mq") {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${quality}default.jpg`
}

export function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0))
  const minutes = Math.floor(safe / 60)
  const rest = String(safe % 60).padStart(2, "0")
  return `${minutes}:${rest}`
}

export function splitTrackTitle(title: string, author = "") {
  const clean = title
    .replace(/\s*[\[({](official\s+)?(music\s+)?(video|audio|visuali[sz]er|lyrics?|hd|4k)[^\])}]*[\])}]/gi, "")
    .trim()
  const divider = clean.match(/^(.+?)\s[-–—|]\s(.+)$/)
  if (divider) return { artist: divider[1].trim(), title: divider[2].trim() }
  return { artist: author.replace(/\s*-\s*(Topic|VEVO)$/i, "").trim(), title: clean || title }
}
