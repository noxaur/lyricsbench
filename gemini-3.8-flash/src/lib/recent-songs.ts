import type { RecentSong, TrackMetadata } from "../types/song"

const RECENT_STORAGE_KEY = "umbra-recent-songs"
const MAX_RECENT = 20

export function getRecentSongs(): RecentSong[] {
  try {
    const raw = localStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RecentSong[]
  } catch {
    return []
  }
}

export function addRecentSong(song: TrackMetadata): void {
  if (!song.videoId) return
  const current = getRecentSongs().filter((s) => s.videoId !== song.videoId)
  const updated: RecentSong = {
    ...song,
    playedAt: Date.now(),
  }
  const next = [updated, ...current].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function clearRecentSongs(): void {
  try {
    localStorage.removeItem(RECENT_STORAGE_KEY)
  } catch {
    // ignore
  }
}
