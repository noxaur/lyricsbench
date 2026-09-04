export type RecentSong = {
  videoId: string;
  title: string;
  artist: string;
  track: string;
  visitedAt: number;
};

const STORAGE_KEY = "umbra-recent-songs";
const MAX_RECENT = 20;

function readRecent(): RecentSong[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeRecent(songs: RecentSong[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch {}
}

export function getRecentSongs(): RecentSong[] {
  return readRecent();
}

export function addRecentSong(song: Omit<RecentSong, "visitedAt">): void {
  const recent = readRecent().filter((s) => s.videoId !== song.videoId);
  recent.unshift({ ...song, visitedAt: Date.now() });
  writeRecent(recent.slice(0, MAX_RECENT));
}

export function clearRecentSongs(): void {
  writeRecent([]);
}
