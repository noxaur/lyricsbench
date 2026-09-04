export function formatDuration(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const m = Math.floor(clamped / 60)
  const s = Math.floor(clamped % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatOffset(ms: number): string {
  const sec = ms / 1000
  const sign = sec > 0 ? "+" : ""
  return `${sign}${sec.toFixed(1)}s`
}

export function youtubeThumb(videoId: string, quality: "mqdefault" | "hqdefault" = "hqdefault") {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`
}
