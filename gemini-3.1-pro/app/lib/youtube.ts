export function extractYoutubeId(urlOrId: string): string | null {
    if (urlOrId.length === 11 && !urlOrId.includes('/')) return urlOrId;
    const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/);
    return match ? match[1] : null;
}

export async function getYoutubeTitle(youtubeId: string): Promise<string | null> {
    try {
        const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeId}&format=json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.title;
    } catch (e) {
        console.error("Failed to fetch youtube title:", e);
        return null;
    }
}

export function cleanTrackTitle(title: string): string {
    // Remove "Official Music Video", "Official Video", "Lyrics", etc.
    let cleaned = title.replace(/\([^)]*official[^)]*\)/gi, '');
    cleaned = cleaned.replace(/\[[^\]]*official[^\]]*\]/gi, '');
    cleaned = cleaned.replace(/\([^)]*video[^)]*\)/gi, '');
    cleaned = cleaned.replace(/\[[^\]]*video[^\]]*\]/gi, '');
    cleaned = cleaned.replace(/\([^)]*audio[^)]*\)/gi, '');
    cleaned = cleaned.replace(/\[[^\]]*audio[^\]]*\]/gi, '');
    cleaned = cleaned.replace(/\([^)]*lyric[^)]*\)/gi, '');
    cleaned = cleaned.replace(/\[[^\]]*lyric[^\]]*\]/gi, '');
    cleaned = cleaned.replace(/\bMV\b/gi, '');
    
    // Split on dash if artist - title format is common
    return cleaned.trim();
}
