import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Sparkles, Dices, Clock, Flame, Play, Music } from "lucide-react"
import { SongSearch } from "../components/song-search"
import { SAMPLE_SONGS } from "../lib/sample-songs"
import { getRecentSongs } from "../lib/recent-songs"
import { formatTime } from "../lib/utils"

export function HomePage() {
  const navigate = useNavigate()
  const recentSongs = getRecentSongs()
  const [isPickingRandom, setIsPickingRandom] = useState(false)

  const handleRandomSong = () => {
    setIsPickingRandom(true)
    const randomIndex = Math.floor(Math.random() * SAMPLE_SONGS.length)
    const chosen = SAMPLE_SONGS[randomIndex]
    setTimeout(() => {
      navigate(`/play/${chosen.videoId}`)
    }, 200)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-12 md:py-20 max-w-5xl mx-auto w-full">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mb-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          The Dimmed Venue · Synced Karaoke
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground">
          Sing in the <span className="text-primary drop-shadow-[0_0_20px_var(--color-primary)]">stage light</span>.
        </h1>

        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
          Real-time synchronized karaoke with smooth dual-layer word sweep, zero-drift timing calibration, and 40+ stage themes.
        </p>
      </div>

      {/* Main Search Bar */}
      <div className="w-full max-w-2xl mb-6">
        <SongSearch autoFocus placeholder="Search song, artist, lyrics, or paste YouTube URL…" />
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-3 mb-16">
        <button
          type="button"
          onClick={handleRandomSong}
          disabled={isPickingRandom}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border/70 hover:border-primary/60 hover:bg-muted/40 text-foreground text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
        >
          <Dices className="w-4 h-4 text-primary" />
          {isPickingRandom ? "Discovering…" : "Surprise Me"}
        </button>
      </div>

      {/* Featured Showcase Samples */}
      <section className="w-full mb-14">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Featured Showcase</h2>
          </div>
          <span className="text-xs text-muted-foreground">Pre-calibrated with word-level LRC</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SAMPLE_SONGS.map((song) => (
            <button
              key={song.videoId}
              type="button"
              onClick={() => navigate(`/play/${song.videoId}`)}
              className="group p-4 rounded-2xl bg-card/80 border border-border/60 hover:border-primary/50 hover:bg-card text-left transition-all duration-200 flex flex-col gap-3 shadow-md hover:shadow-xl relative overflow-hidden"
            >
              <div className="relative w-full aspect-video rounded-xl bg-muted/60 overflow-hidden">
                <img
                  src={song.thumbnail}
                  alt={song.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 font-mono text-[11px] text-white">
                  {formatTime(song.durationSec)}
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {song.track}
                </h3>
                <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Recent Songs History */}
      {recentSongs.length > 0 && (
        <section className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Recently Played</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSongs.map((song) => (
              <button
                key={`${song.videoId}-${song.playedAt}`}
                type="button"
                onClick={() => navigate(`/play/${song.videoId}`)}
                className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/50 hover:border-border hover:bg-muted/40 text-left transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {song.thumbnail ? (
                    <img src={song.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {song.track || song.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{song.artist}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
