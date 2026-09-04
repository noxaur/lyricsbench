import type { Playlist, PlaylistTrack } from "../types/playlist"
import type { TrackMetadata } from "../types/song"

const PLAYLISTS_STORAGE_KEY = "umbra-playlists"

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: "favorites",
    title: "Favorites",
    description: "Your favorite sing-along tracks",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    tracks: [
      {
        videoId: "dQw4w9WgXcQ",
        title: "Rick Astley - Never Gonna Give You Up",
        artist: "Rick Astley",
        track: "Never Gonna Give You Up",
        album: "Whenever You Need Somebody",
        durationSec: 213,
        thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        addedAt: Date.now() - 86400000,
      },
      {
        videoId: "fJ9rUzIMcZQ",
        title: "Queen – Bohemian Rhapsody",
        artist: "Queen",
        track: "Bohemian Rhapsody",
        album: "A Night at the Opera",
        durationSec: 359,
        thumbnail: "https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
        addedAt: Date.now() - 43200000,
      },
      {
        videoId: "SX_ViT4Ra7k",
        title: "米津玄師 - Lemon",
        artist: "米津玄師",
        track: "Lemon",
        album: "STRAY SHEEP",
        durationSec: 256,
        thumbnail: "https://i.ytimg.com/vi/SX_ViT4Ra7k/hqdefault.jpg",
        addedAt: Date.now() - 21600000,
      },
    ],
  },
]

export function getPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(DEFAULT_PLAYLISTS))
      return DEFAULT_PLAYLISTS
    }
    return JSON.parse(raw) as Playlist[]
  } catch {
    return DEFAULT_PLAYLISTS
  }
}

export function savePlaylists(playlists: Playlist[]): void {
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists))
  } catch {
    // ignore
  }
}

export function getPlaylistById(id: string): Playlist | null {
  const all = getPlaylists()
  return all.find((p) => p.id === id) ?? null
}

export function createPlaylist(title: string, description = ""): Playlist {
  const all = getPlaylists()
  const newPlaylist: Playlist = {
    id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: title.trim() || "Untitled Playlist",
    description: description.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tracks: [],
  }
  savePlaylists([...all, newPlaylist])
  return newPlaylist
}

export function addTrackToPlaylist(playlistId: string, track: TrackMetadata): void {
  const all = getPlaylists()
  const updated = all.map((p) => {
    if (p.id !== playlistId) return p
    if (p.tracks.some((t) => t.videoId === track.videoId)) return p
    const newTrack: PlaylistTrack = {
      ...track,
      addedAt: Date.now(),
    }
    return {
      ...p,
      updatedAt: Date.now(),
      tracks: [newTrack, ...p.tracks],
    }
  })
  savePlaylists(updated)
}

export function removeTrackFromPlaylist(playlistId: string, videoId: string): void {
  const all = getPlaylists()
  const updated = all.map((p) => {
    if (p.id !== playlistId) return p
    return {
      ...p,
      updatedAt: Date.now(),
      tracks: p.tracks.filter((t) => t.videoId !== videoId),
    }
  })
  savePlaylists(updated)
}

export function deletePlaylist(playlistId: string): void {
  const all = getPlaylists()
  savePlaylists(all.filter((p) => p.id !== playlistId))
}
