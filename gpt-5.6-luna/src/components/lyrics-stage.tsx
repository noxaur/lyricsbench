import { useEffect, useMemo, useRef } from "react";
import type { LyricLine } from "../data/songs";

export type LyricLanguage = "original" | "english" | "both";

type LyricsStageProps = {
  lyrics: LyricLine[];
  currentTime: number;
  duration: number;
  offset: number;
  language: LyricLanguage;
  following: boolean;
  onFollowingChange: (following: boolean) => void;
  onSeek: (time: number) => void;
  onActiveChange: (line: LyricLine, index: number) => void;
};

function getActiveIndex(lines: LyricLine[], time: number): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].at <= time) return index;
  }
  return 0;
}

export function LyricsStage({
  lyrics,
  currentTime,
  duration,
  offset,
  language,
  following,
  onFollowingChange,
  onSeek,
  onActiveChange,
}: LyricsStageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<Array<HTMLButtonElement | null>>([]);
  const programmaticScroll = useRef(false);
  const scrollTimer = useRef<number | undefined>(undefined);
  const lyricTime = currentTime + offset;
  const activeIndex = useMemo(() => getActiveIndex(lyrics, lyricTime), [lyrics, lyricTime]);
  const active = lyrics[activeIndex];
  const nextLine = lyrics[activeIndex + 1];
  const wordCutoff = nextLine ? Math.max(0, Math.min(1, (lyricTime - active.at) / (nextLine.at - active.at))) : 1;

  useEffect(() => {
    onActiveChange(active, activeIndex);
  }, [active, activeIndex, onActiveChange]);

  useEffect(() => {
    if (!following) return;
    const element = linesRef.current[activeIndex];
    if (!element) return;
    programmaticScroll.current = true;
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      programmaticScroll.current = false;
    }, 520);
    return () => {
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    };
  }, [activeIndex, following]);

  const handleScroll = () => {
    if (!programmaticScroll.current && following) onFollowingChange(false);
  };

  return (
    <section className="lyrics-stage" aria-label="Timed lyrics">
      <div className="lyrics-stage__topline">
        <div>
          <span className="eyebrow">Live lyric reel</span>
          <span className="lyrics-stage__source"><i /> Synced from local session</span>
        </div>
        {!following && (
          <button className="follow-button" type="button" onClick={() => onFollowingChange(true)}>
            Follow lyric
          </button>
        )}
      </div>
      <div className="lyrics-stage__viewport" ref={scrollRef} onScroll={handleScroll}>
        <div className="lyrics-stage__stack">
          <div className="lyrics-stage__spacer" aria-hidden="true" />
          {lyrics.map((line, index) => {
            const distance = Math.abs(index - activeIndex);
            const isActive = index === activeIndex;
            const isPast = index < activeIndex;
            const sectionChanged = line.section && (index === 0 || lyrics[index - 1]?.section !== line.section);
            return (
              <div className={`lyric-wrap${isActive ? " is-active" : ""}${distance === 1 ? " is-near" : ""}${distance > 2 ? " is-far" : ""}`} key={`${line.at}-${line.text}`}>
                {sectionChanged && <p className="lyric-section">{line.section}</p>}
                <button
                  type="button"
                  className={`lyric-line${isPast ? " is-past" : ""}`}
                  ref={(element) => { linesRef.current[index] = element; }}
                  onClick={() => {
                    onSeek(line.at - offset);
                    onFollowingChange(true);
                  }}
                  aria-label={`Jump to ${line.text}`}
                >
                  <span className="lyric-line__time">{String(Math.floor(line.at / 60)).padStart(2, "0")}:{String(Math.round(line.at % 60)).padStart(2, "0")}</span>
                  {language === "english" ? (
                    <span className="lyric-line__words lyric-line__words--translation">{line.translation}</span>
                  ) : (
                    <span className="lyric-line__words">
                      {line.words?.map((word, wordIndex) => {
                        const wordProgress = Math.max(0, Math.min(1, (lyricTime - word.at) / 0.38));
                        const isWordDone = isActive && wordProgress > 0.12;
                        return (
                          <span
                            className={isWordDone ? "is-sung" : undefined}
                            style={isActive ? { "--word-progress": wordProgress } as React.CSSProperties : undefined}
                            key={`${word.text}-${wordIndex}`}
                          >
                            {word.text}{wordIndex < (line.words?.length ?? 0) - 1 ? " " : ""}
                          </span>
                        );
                      }) ?? line.text}
                    </span>
                  )}
                  {language === "both" && <span className="lyric-line__translation">{line.translation}</span>}
                  {isActive && <span className="lyric-line__meter" style={{ "--line-progress": `${wordCutoff * 100}%` } as React.CSSProperties} />}
                </button>
              </div>
            );
          })}
          <div className="lyrics-stage__spacer" aria-hidden="true" />
        </div>
      </div>
      <div className="lyrics-stage__footer">
        <span>{following ? "Following the current line" : "You’re browsing — playback stays put"}</span>
        <span>{Math.max(0, Math.round((duration - currentTime) / 60))} min left</span>
      </div>
    </section>
  );
}
