import type { LyricLine } from "@/types/lyrics";

export type PlaylistTrack = {
  videoId: string;
  title: string;
  artist: string;
  track: string;
  addedAt: number;
};

export type Playlist = {
  id: string;
  name: string;
  tracks: PlaylistTrack[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "umbra-playlists";

function readPlaylists(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePlaylists(playlists: Playlist[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch {}
}

export function getAllPlaylists(): Playlist[] {
  return readPlaylists();
}

export function getPlaylistById(id: string): Playlist | undefined {
  return readPlaylists().find((p) => p.id === id);
}

export function createPlaylist(name: string): Playlist {
  const playlists = readPlaylists();
  const playlist: Playlist = {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    tracks: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  playlists.push(playlist);
  writePlaylists(playlists);
  return playlist;
}

export function deletePlaylist(id: string): void {
  writePlaylists(readPlaylists().filter((p) => p.id !== id));
}

export function renamePlaylist(id: string, name: string): void {
  const playlists = readPlaylists();
  const playlist = playlists.find((p) => p.id === id);
  if (playlist) {
    playlist.name = name;
    playlist.updatedAt = Date.now();
    writePlaylists(playlists);
  }
}

export function addTrackToPlaylist(playlistId: string, track: Omit<PlaylistTrack, "addedAt">): void {
  const playlists = readPlaylists();
  const playlist = playlists.find((p) => p.id === playlistId);
  if (playlist) {
    if (!playlist.tracks.some((t) => t.videoId === track.videoId)) {
      playlist.tracks.push({ ...track, addedAt: Date.now() });
      playlist.updatedAt = Date.now();
      writePlaylists(playlists);
    }
  }
}

export function removeTrackFromPlaylist(playlistId: string, videoId: string): void {
  const playlists = readPlaylists();
  const playlist = playlists.find((p) => p.id === playlistId);
  if (playlist) {
    playlist.tracks = playlist.tracks.filter((t) => t.videoId !== videoId);
    playlist.updatedAt = Date.now();
    writePlaylists(playlists);
  }
}
