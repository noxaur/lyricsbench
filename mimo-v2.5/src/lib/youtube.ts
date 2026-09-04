export type YouTubeVideoInfo = {
  title: string;
  author: string;
  videoId: string;
  thumbnailUrl?: string;
};

const OMBED_BASE = "/api/youtube/oembed";

export async function fetchYouTubeOembed(videoId: string, signal?: AbortSignal): Promise<YouTubeVideoInfo> {
  const res = await fetch(`${OMBED_BASE}?videoId=${videoId}`, { signal });
  if (!res.ok) throw new Error(`oEmbed fetch failed: ${res.status}`);
  const data = await res.json() as YouTubeVideoInfo;
  return data;
}

export function extractVideoId(url: string): string | null {
  // Standard YouTube URLs
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function extractSpotifyId(url: string): { type: "track" | "playlist"; id: string } | null {
  const match = url.match(/open\.spotify\.com\/(track|playlist)\/([a-zA-Z0-9]+)/);
  if (match) return { type: match[1] as "track" | "playlist", id: match[2] };
  return null;
}

export function parseTrackTitle(title: string): { artist: string; track: string } {
  // Try "Artist - Track" format
  const dashMatch = title.match(/^(.+?)\s*[-–—]\s*(.+?)(?:\s*\(.*?\))*$/);
  if (dashMatch) {
    return { artist: dashMatch[1].trim(), track: dashMatch[2].trim() };
  }
  // Fallback: use full title as track
  return { artist: "", track: title.trim() };
}
