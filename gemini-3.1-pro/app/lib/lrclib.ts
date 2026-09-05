import { parseLrc } from './lrc-parser';
import type { LyricLine } from './lrc-parser';

export async function fetchLyrics(trackName: string, artistName: string): Promise<LyricLine[] | null> {
    try {
        const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(trackName)}&artist_name=${encodeURIComponent(artistName)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        
        if (data.syncedLyrics) {
            return parseLrc(data.syncedLyrics);
        } else if (data.plainLyrics) {
            // Fake timing if we only have plain lyrics?
            // For now, let's just return empty array or fake it.
            return [];
        }
        return null;
    } catch (e) {
        console.error("Failed to fetch lyrics:", e);
        return null;
    }
}

export async function searchLyrics(q: string): Promise<LyricLine[] | null> {
    try {
        const url = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        
        // Find best match with synced lyrics
        const bestMatch = data.find((item: any) => item.syncedLyrics);
        if (bestMatch?.syncedLyrics) {
            return parseLrc(bestMatch.syncedLyrics);
        }
        return null;
    } catch (e) {
        console.error("Failed to search lyrics:", e);
        return null;
    }
}
