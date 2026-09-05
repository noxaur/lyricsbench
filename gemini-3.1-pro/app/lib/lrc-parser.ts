export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export function parseLrc(lrc: string): LyricLine[] {
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const milliseconds = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10);
    
    const time = minutes * 60 + seconds + milliseconds / 1000;
    const text = line.replace(timeRegex, '').trim();
    
    // Some LRC files have blank lines, we can choose to keep them for pacing, or discard.
    // Let's keep them as they indicate instrumental breaks sometimes.
    result.push({ time, text });
  }

  // Ensure sorted by time
  return result.sort((a, b) => a.time - b.time);
}
