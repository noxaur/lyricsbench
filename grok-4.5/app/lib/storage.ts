import type { LyricsHit } from "./types"
import type { Playlist, RecentSong, TrackMeta } from "./types"

const RECENT_KEY = "umbra-recent"
const PLAYLISTS_KEY = "umbra-playlists"
const THEME_KEY = "umbra-theme"
const VIDEO_HIDDEN_KEY = "umbra-video-hidden"
const CACHE_KEY = "umbra-lyrics-cache"
const OFFSET_KEY = "umbra-offsets"
const MAX_RECENT = 12
const MAX_CACHE = 40
const MAX_PLAYLISTS = 20
const MAX_TRACKS = 80

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // quota
  }
}

export function getRecentSongs(): RecentSong[] {
  return readJson<RecentSong[]>(RECENT_KEY, [])
}

export function addRecentSong(song: TrackMeta) {
  const next = [
    { ...song, playedAt: Date.now() },
    ...getRecentSongs().filter((item) => item.videoId !== song.videoId),
  ].slice(0, MAX_RECENT)
  writeJson(RECENT_KEY, next)
}

export function clearRecentSongs() {
  writeJson(RECENT_KEY, [])
}

export function readPlaylists(): Playlist[] {
  return readJson<Playlist[]>(PLAYLISTS_KEY, [])
}

function savePlaylists(list: Playlist[]) {
  writeJson(PLAYLISTS_KEY, list)
}

export function createPlaylist(name: string): Playlist {
  const playlist: Playlist = {
    id: `playlist-${crypto.randomUUID()}`,
    name: name.trim() || "Untitled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tracks: [],
  }
  savePlaylists([playlist, ...readPlaylists()].slice(0, MAX_PLAYLISTS))
  return playlist
}

export function renamePlaylist(id: string, name: string) {
  savePlaylists(
    readPlaylists().map((p) =>
      p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: new Date().toISOString() } : p,
    ),
  )
}

export function deletePlaylist(id: string) {
  savePlaylists(readPlaylists().filter((p) => p.id !== id))
}

export function addToPlaylist(id: string, track: TrackMeta) {
  savePlaylists(
    readPlaylists().map((p) => {
      if (p.id !== id) return p
      const tracks = [
        { ...track, addedAt: Date.now() },
        ...p.tracks.filter((t) => t.videoId !== track.videoId),
      ].slice(0, MAX_TRACKS)
      return { ...p, tracks, updatedAt: new Date().toISOString() }
    }),
  )
}

export function removeFromPlaylist(id: string, videoId: string) {
  savePlaylists(
    readPlaylists().map((p) =>
      p.id === id
        ? { ...p, tracks: p.tracks.filter((t) => t.videoId !== videoId), updatedAt: new Date().toISOString() }
        : p,
    ),
  )
}

export function getPlaylist(id: string): Playlist | undefined {
  return readPlaylists().find((p) => p.id === id)
}

export function getThemeId(): string {
  return readJson<string>(THEME_KEY, "ember")
}

export function setThemeId(id: string) {
  writeJson(THEME_KEY, id)
}

export function getVideoHidden(): boolean {
  return readJson<boolean>(VIDEO_HIDDEN_KEY, false)
}

export function setVideoHidden(hidden: boolean) {
  writeJson(VIDEO_HIDDEN_KEY, hidden)
}

export type CachedLyrics = {
  videoId: string
  artist: string
  track: string
  title: string
  durationSec: number
  hit: LyricsHit
  english?: string[]
}

export function getLyricsCache(videoId: string): CachedLyrics | null {
  const all = readJson<CachedLyrics[]>(CACHE_KEY, [])
  return all.find((item) => item.videoId === videoId) ?? null
}

export function setLyricsCache(entry: CachedLyrics) {
  const all = [entry, ...readJson<CachedLyrics[]>(CACHE_KEY, []).filter((item) => item.videoId !== entry.videoId)]
  writeJson(CACHE_KEY, all.slice(0, MAX_CACHE))
}

/** Per-video offset — never bleed timing across songs. */
export function getOffset(videoId: string): number {
  return readJson<Record<string, number>>(OFFSET_KEY, {})[videoId] ?? 0
}

export function setOffset(videoId: string, ms: number) {
  const all = readJson<Record<string, number>>(OFFSET_KEY, {})
  all[videoId] = ms
  writeJson(OFFSET_KEY, all)
}
