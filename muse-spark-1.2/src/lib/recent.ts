// Simple recent songs store via localStorage
export type RecentSong = { videoId: string; title: string; artist: string; at: number }

const KEY = "umbra-recent-v2"
const MAX = 20

export function getRecent(): RecentSong[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function addRecent(song: Omit<RecentSong, "at">) {
  const list = getRecent().filter((s) => s.videoId !== song.videoId)
  list.unshift({ ...song, at: Date.now() })
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))) } catch {}
}

export function clearRecent() {
  try { localStorage.removeItem(KEY) } catch {}
}
