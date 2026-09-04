export type QueueTrack = {
  videoId: string;
  title: string;
  artist: string;
  track: string;
  addedAt: number;
};

const STORAGE_KEY = "umbra-song-queue";

function readQueue(): QueueTrack[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueueTrack[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {}
}

export function getQueue(): QueueTrack[] {
  return readQueue();
}

export function addToQueue(track: Omit<QueueTrack, "addedAt">): QueueTrack {
  const queue = readQueue();
  const item = { ...track, addedAt: Date.now() };
  queue.push(item);
  writeQueue(queue);
  return item;
}

export function removeFromQueue(videoId: string): void {
  writeQueue(readQueue().filter((t) => t.videoId !== videoId));
}

export function clearQueue(): void {
  writeQueue([]);
}

export function getNextTrack(currentVideoId: string): QueueTrack | null {
  const queue = readQueue();
  const idx = queue.findIndex((t) => t.videoId === currentVideoId);
  if (idx >= 0 && idx < queue.length - 1) return queue[idx + 1];
  return queue.length > 0 ? queue[0] : null;
}

export function getPrevTrack(currentVideoId: string): QueueTrack | null {
  const queue = readQueue();
  const idx = queue.findIndex((t) => t.videoId === currentVideoId);
  if (idx > 0) return queue[idx - 1];
  return null;
}
