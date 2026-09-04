const OFFSET_KEY_PREFIX = "umbra-offset-"

export function getStoredOffset(videoId: string): number {
  if (!videoId) return 0
  try {
    const raw = localStorage.getItem(`${OFFSET_KEY_PREFIX}${videoId}`)
    if (raw !== null) {
      const parsed = parseInt(raw, 10)
      if (Number.isFinite(parsed)) return parsed
    }
  } catch {
    // ignore
  }
  return 0
}

export function saveStoredOffset(videoId: string, offsetMs: number): void {
  if (!videoId) return
  try {
    if (offsetMs === 0) {
      localStorage.removeItem(`${OFFSET_KEY_PREFIX}${videoId}`)
    } else {
      localStorage.setItem(`${OFFSET_KEY_PREFIX}${videoId}`, offsetMs.toString())
    }
  } catch {
    // ignore
  }
}

/**
 * Novel feature: Anchor line to current playback time.
 * If the user clicks "Anchor to now" on a lyric line when they hear it sing,
 * this calculates the delta needed to shift that line exactly to the current audio time!
 */
export function calculateAnchorOffset(
  lineOriginalStartMs: number,
  currentPlaybackMs: number,
): number {
  return Math.round(currentPlaybackMs - lineOriginalStartMs)
}
