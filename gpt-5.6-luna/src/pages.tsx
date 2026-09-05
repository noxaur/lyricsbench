import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Artwork } from "./components/artwork";
import { Icon } from "./components/icon";
import { LyricsStage, type LyricLanguage } from "./components/lyrics-stage";
import { Shell } from "./components/shell";
import { Transport } from "./components/transport";
import { findSongs, songForId, songs, type Song } from "./data/songs";
import { clamp, formatTime, slugFromInput } from "./lib/format";
import { clearRecentSongs, readRecentSongs, rememberSong, type RecentSong } from "./lib/history";
import { themeOptions, useTheme } from "./lib/theme";

function SongRow({ song, index, compact = false }: { song: Pick<Song, "id" | "title" | "artist" | "album" | "artwork" | "accent" | "accentSoft" | "duration">; index?: number; compact?: boolean }) {
  return (
    <Link className={`song-row${compact ? " song-row--compact" : ""}`} to={`/play/${song.id}`}>
      {typeof index === "number" && <span className="song-row__number">{String(index + 1).padStart(2, "0")}</span>}
      <Artwork song={song as Song} small />
      <span className="song-row__copy">
        <strong>{song.title}</strong>
        <small>{song.artist}</small>
      </span>
      <span className="song-row__album">{song.album}</span>
      <span className="song-row__duration">{formatTime(song.duration)}</span>
      <span className="song-row__play"><Icon name="play" size={15} /></span>
    </Link>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [recent, setRecent] = useState<RecentSong[]>(readRecentSongs);
  const results = useMemo(() => findSongs(query).slice(0, 4), [query]);

  const openSong = (id: string) => {
    navigate(`/play/${id}`);
    setSearchOpen(false);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (results.length === 1 && query.trim()) openSong(results[0].id);
    else openSong(slugFromInput(query));
  };

  return (
    <Shell>
      <main className="home-page">
        <section className="home-hero">
          <div className="home-hero__stage-mark" aria-hidden="true">
            <span className="home-hero__orb" />
            <span className="home-hero__orbit home-hero__orbit--one" />
            <span className="home-hero__orbit home-hero__orbit--two" />
          </div>
          <p className="home-hero__kicker">Lyrics, in time</p>
          <h1>Find the line<br />you came for.</h1>
          <p className="home-hero__copy">Drop into a song, keep your place, and let the words take the room.</p>
          <form className="song-search" onSubmit={submit}>
            <Icon name="search" size={20} />
            <input
              type="text"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search a song, artist, or paste a link"
              aria-label="Search a song, artist, or paste a link"
            />
            <button type="submit" aria-label="Open song"><Icon name="arrow-right" size={21} /></button>
            {isSearchOpen && (
              <div className="search-results" role="listbox" aria-label="Songs">
                {results.length ? results.map((song) => (
                  <button key={song.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => openSong(song.id)}>
                    <Artwork song={song} small />
                    <span><strong>{song.title}</strong><small>{song.artist}</small></span>
                    <Icon name="arrow-right" size={17} />
                  </button>
                )) : (
                  <button type="button" className="search-results__free" onMouseDown={(event) => event.preventDefault()} onClick={() => openSong(slugFromInput(query))}>
                    <span className="search-results__free-icon"><Icon name="link" size={18} /></span>
                    <span><strong>Open this song</strong><small>We’ll create a local lyric session for “{query}”</small></span>
                    <Icon name="arrow-right" size={17} />
                  </button>
                )}
              </div>
            )}
          </form>
          <p className="home-hero__hint"><Icon name="spark" size={14} /> Supports song titles plus YouTube and Spotify links</p>
        </section>

        <section className="home-shelf" aria-labelledby="start-here">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 id="start-here">Tonight’s room tone</h2>
            </div>
            <span>Four synchronized sessions</span>
          </div>
          <div className="song-grid">
            {songs.map((song) => (
              <Link className="song-card" to={`/play/${song.id}`} key={song.id}>
                <Artwork song={song} />
                <span className="song-card__play"><Icon name="play" size={18} /></span>
                <span className="song-card__copy"><strong>{song.title}</strong><small>{song.artist}</small></span>
                <span className="song-card__time">{formatTime(song.duration)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-lower">
          <div className="recent-panel">
            <div className="section-heading section-heading--small">
              <div><p className="eyebrow">Your last stops</p><h2>Keep listening</h2></div>
              {recent.length > 0 && <button className="text-button" type="button" onClick={() => { clearRecentSongs(); setRecent([]); }}>Clear</button>}
            </div>
            {recent.length ? (
              <div className="song-list">{recent.map((song, index) => <SongRow song={song} index={index} key={song.id} />)}</div>
            ) : (
              <div className="empty-list"><Icon name="music" size={22} /><p>Your last few sessions will stay here.</p></div>
            )}
          </div>
          <aside className="home-note">
            <span className="home-note__icon"><Icon name="spark" size={20} /></span>
            <h2>A better way to follow along.</h2>
            <p>Tap a line to jump there. Nudge lyrics without losing the song. The stage follows only when you want it to.</p>
            <Link to="/themes">Choose your room <Icon name="arrow-right" size={16} /></Link>
          </aside>
        </section>
      </main>
    </Shell>
  );
}

export function PlayerPage() {
  const { videoId } = useParams();
  const song = useMemo(() => songForId(videoId), [videoId]);
  const [currentTime, setCurrentTime] = useState(65.1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.82);
  const [offset, setOffset] = useState(0);
  const [language, setLanguage] = useState<LyricLanguage>("both");
  const [following, setFollowing] = useState(true);
  const [showVideo, setShowVideo] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [activeLabel, setActiveLabel] = useState(song.lyrics[0].text);
  const [lyricsStatus, setLyricsStatus] = useState<"ready" | "refreshing" | "fresh">("ready");
  const lastFrame = useRef<number | null>(null);

  useEffect(() => {
    rememberSong(song);
    setCurrentTime(65.1);
    setIsPlaying(false);
    setOffset(0);
    setFollowing(true);
    setActiveLabel(song.lyrics[0].text);
  }, [song]);

  useEffect(() => {
    if (!isPlaying) {
      lastFrame.current = null;
      return;
    }
    let frame = 0;
    const tick = (now: number) => {
      const previous = lastFrame.current ?? now;
      const elapsed = (now - previous) / 1000;
      lastFrame.current = now;
      setCurrentTime((time) => {
        const next = time + elapsed;
        if (next >= song.duration) {
          setIsPlaying(false);
          return song.duration;
        }
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, song.duration]);

  const seek = useCallback((time: number) => {
    setCurrentTime(clamp(time, 0, song.duration));
  }, [song.duration]);

  const nudge = useCallback((seconds: number) => seek(currentTime + seconds), [currentTime, seek]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
      }
      if (event.key === "ArrowLeft") { event.preventDefault(); nudge(-5); }
      if (event.key === "ArrowRight") { event.preventDefault(); nudge(5); }
      if (event.key === "-") { event.preventDefault(); setOffset((value) => clamp(value - 0.1, -4, 4)); }
      if (event.key === "+" || event.key === "=") { event.preventDefault(); setOffset((value) => clamp(value + 0.1, -4, 4)); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nudge]);

  const refreshLyrics = () => {
    setLyricsStatus("refreshing");
    window.setTimeout(() => setLyricsStatus("fresh"), 560);
    window.setTimeout(() => setLyricsStatus("ready"), 2500);
  };

  const activeChange = useCallback((line: { text: string }) => setActiveLabel(line.text), []);

  return (
    <Shell player>
      <main className={`player-page${focusMode ? " player-page--focus" : ""}`}>
        <div className="player-page__crumb">
          <Link to="/"><Icon name="arrow-left" size={16} /> Your room</Link>
          <p><span /> {lyricsStatus === "refreshing" ? "Looking for a cleaner sync…" : lyricsStatus === "fresh" ? "Fresh sync applied" : "Lyrics locked to the session"}</p>
        </div>
        <div className="player-layout">
          <aside className="now-panel" aria-label="Now playing">
            <div className={`now-panel__visual${showVideo ? "" : " now-panel__visual--hidden"}`}>
              {showVideo ? (
                <>
                  <Artwork song={song} />
                  <span className="visual-noise" />
                  <div className="now-panel__live"><span /> LIVE SESSION</div>
                  <button type="button" className="visual-play" onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? "Pause song" : "Play song"}>
                    <Icon name={isPlaying ? "pause" : "play"} size={22} />
                  </button>
                </>
              ) : (
                <div className="now-panel__concealed"><Icon name="music" size={28} /><span>Video concealed</span></div>
              )}
            </div>
            <div className="now-panel__meta">
              <span className="eyebrow">Now playing</span>
              <h1>{song.title}</h1>
              <p>{song.artist} <span>·</span> {song.album}</p>
              <div className="now-panel__eq" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
            <div className="now-panel__actions">
              <button type="button" className="quiet-action" onClick={() => setShowVideo((visible) => !visible)}><Icon name="music" size={16} /> {showVideo ? "Conceal video" : "Show video"}</button>
              <button type="button" className="quiet-action" onClick={() => setFocusMode((focused) => !focused)}><Icon name={focusMode ? "shrink" : "expand"} size={16} /> {focusMode ? "Exit focus" : "Focus lyrics"}</button>
            </div>
          </aside>

          <LyricsStage
            lyrics={song.lyrics}
            currentTime={currentTime}
            duration={song.duration}
            offset={offset}
            language={language}
            following={following}
            onFollowingChange={setFollowing}
            onSeek={seek}
            onActiveChange={activeChange}
          />

          <aside className="session-panel" aria-label="Lyrics settings">
            <div className="session-panel__header"><span className="eyebrow">Session controls</span><Icon name="sliders" size={17} /></div>
            <section className="control-section">
              <div className="control-section__heading"><h2>Language</h2><span>Ready</span></div>
              <div className="segmented" role="group" aria-label="Lyric language">
                {(["original", "english", "both"] as LyricLanguage[]).map((option) => (
                  <button key={option} type="button" onClick={() => setLanguage(option)} aria-pressed={language === option}>
                    {option === "original" ? "Original" : option === "english" ? "Spanish" : "Both"}
                  </button>
                ))}
              </div>
              <p className="control-section__detail">Bilingual lyrics are aligned to the same cue points.</p>
            </section>
            <section className="control-section control-section--sync">
              <div className="control-section__heading"><h2>Line timing</h2><span>{offset === 0 ? "On cue" : `${offset > 0 ? "+" : ""}${offset.toFixed(1)}s`}</span></div>
              <div className="timing-control">
                <button type="button" onClick={() => setOffset((value) => clamp(value - 0.1, -4, 4))} aria-label="Move lyrics earlier">−</button>
                <div><span className="timing-control__needle" style={{ left: `${((offset + 4) / 8) * 100}%` }} /></div>
                <button type="button" onClick={() => setOffset((value) => clamp(value + 0.1, -4, 4))} aria-label="Move lyrics later">+</button>
              </div>
              <div className="timing-control__labels"><span>Earlier</span><button type="button" onClick={() => setOffset(0)}>Reset</button><span>Later</span></div>
            </section>
            <section className="control-section control-section--current">
              <span className="eyebrow">On deck</span>
              <blockquote>“{activeLabel}”</blockquote>
              <p>Tap any line in the reel to seek directly to it.</p>
            </section>
            <button className="refresh-button" type="button" onClick={refreshLyrics} disabled={lyricsStatus === "refreshing"}>
              <Icon name="repeat" size={16} /> {lyricsStatus === "refreshing" ? "Refreshing lyrics" : "Refresh lyric sync"}
            </button>
          </aside>
        </div>
        <Transport
          currentTime={currentTime}
          duration={song.duration}
          isPlaying={isPlaying}
          volume={volume}
          onToggle={() => setIsPlaying((playing) => !playing)}
          onSeek={seek}
          onVolume={setVolume}
          onNudge={nudge}
        />
      </main>
    </Shell>
  );
}

export function LibraryPage() {
  return (
    <Shell>
      <main className="utility-page">
        <div className="utility-page__intro"><p className="eyebrow">Library</p><h1>Small collections<br />for a long night.</h1><p>Keep the songs you return to within reach. This local room remembers your place, not your data.</p></div>
        <section className="library-feature">
          <div className="library-feature__art"><Artwork song={songs[0]} /></div>
          <div className="library-feature__copy"><span className="eyebrow">Playlist · 04 tracks</span><h2>After the blue hour</h2><p>A short, glowing run of songs that give the lyric reel room to breathe.</p><Link className="primary-link" to={`/play/${songs[0].id}`}>Begin the room <Icon name="arrow-right" size={17} /></Link></div>
        </section>
        <section className="library-list"><div className="section-heading"><div><p className="eyebrow">Tracklist</p><h2>In order, or wherever</h2></div><span>31 min</span></div><div className="song-list">{songs.map((song, index) => <SongRow song={song} index={index} key={song.id} />)}</div></section>
      </main>
    </Shell>
  );
}

export function RoomsPage() {
  const { theme, setTheme } = useTheme();
  return (
    <Shell>
      <main className="utility-page rooms-page">
        <div className="utility-page__intro"><p className="eyebrow">Rooms</p><h1>Set the light<br />around the words.</h1><p>Each room keeps the lyric stage high-contrast and leaves saturation for the parts that need your attention.</p></div>
        <div className="theme-list">
          {themeOptions.map((option) => (
            <button className={`theme-card theme-card--${option.name}${theme === option.name ? " is-selected" : ""}`} type="button" key={option.name} onClick={() => setTheme(option.name)} aria-pressed={theme === option.name}>
              <span className="theme-card__preview"><i /><i /><i /></span>
              <span className="theme-card__copy"><strong>{option.label}</strong><small>{option.description}</small></span>
              <span className="theme-card__check"><Icon name="check" size={17} /></span>
            </button>
          ))}
        </div>
        <aside className="rooms-tip"><Icon name="sun" size={20} /><p><strong>Built for real rooms.</strong> Your preference remains on this device and controls don’t change the lyrics’ contrast.</p></aside>
      </main>
    </Shell>
  );
}

export function NotFoundPage() {
  return (
    <Shell>
      <main className="not-found"><span className="brand__glyph" aria-hidden="true"><i /></span><p className="eyebrow">The room is elsewhere</p><h1>We couldn’t find that session.</h1><Link className="primary-link" to="/">Return to your room <Icon name="arrow-right" size={17} /></Link></main>
    </Shell>
  );
}
