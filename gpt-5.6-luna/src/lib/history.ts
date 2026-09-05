import type { Song } from "../data/songs";

export type RecentSong = Pick<Song, "id" | "title" | "artist" | "album" | "artwork" | "accent" | "accentSoft" | "duration">;

const key = "umbra-recent-songs";

export function readRecentSongs(): RecentSong[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]") as RecentSong[];
    return Array.isArray(parsed) ? parsed.filter((song) => song && song.id && song.title).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function rememberSong(song: Song): void {
  if (typeof window === "undefined") return;
  const record: RecentSong = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.artwork,
    accent: song.accent,
    accentSoft: song.accentSoft,
    duration: song.duration,
  };
  const rest = readRecentSongs().filter((item) => item.id !== song.id);
  window.localStorage.setItem(key, JSON.stringify([record, ...rest].slice(0, 5)));
}

export function clearRecentSongs(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(key);
}
