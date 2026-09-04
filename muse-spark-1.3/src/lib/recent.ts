/** Recent songs in localStorage. Keyed by videoId, newest first, capped. */

export interface RecentSong {
  videoId: string;
  title: string;
  artist: string;
  track: string;
  playedAt: number;
}

const KEY = "umbra.recent.v1";
const MAX = 30;

export function readRecent(): RecentSong[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as RecentSong[];
    return Array.isArray(data) ? data.filter((s) => typeof s?.videoId === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecent(song: Omit<RecentSong, "playedAt">): RecentSong[] {
  const next = [
    { ...song, playedAt: Date.now() },
    ...readRecent().filter((s) => s.videoId !== song.videoId),
  ].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full / private mode — recents are a nicety, not a requirement
  }
  return next;
}

export function clearRecent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function recentLabel(song: RecentSong): string {
  const track = song.track || song.title;
  return song.artist ? `${song.artist} — ${track}` : track;
}
