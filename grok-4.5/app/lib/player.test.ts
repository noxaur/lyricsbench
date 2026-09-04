import { describe, expect, it } from "vitest"
import { interpolateClock } from "./clock"
import { parseLrc, parsePlainLyrics } from "./lrc"
import { scoreCandidate } from "./match"
import { getActiveLineIndex, getStageState, HOLD_MS } from "./sync"
import { parseTrackTitle } from "./titles"
import { extractSpotifyTrackId, extractYouTubeVideoId } from "./urls"

describe("urls", () => {
  it("reads youtube and spotify ids", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("dQw4w9WgXcQ")
    expect(extractYouTubeVideoId("/play/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(extractYouTubeVideoId("?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
    expect(extractSpotifyTrackId("https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXSi3y?si=x")).toBe(
      "0VjIjW4GlUZAMYd2vXSi3y",
    )
    expect(extractSpotifyTrackId("spotify:track:0VjIjW4GlUZAMYd2vXSi3y")).toBe("0VjIjW4GlUZAMYd2vXSi3y")
  })
})

describe("titles", () => {
  it("splits artist and track and strips promo", () => {
    expect(parseTrackTitle("Rick Astley - Never Gonna Give You Up (Official Video)")).toEqual({
      artist: "Rick Astley",
      track: "Never Gonna Give You Up",
    })
    expect(parseTrackTitle("Never Gonna Give You Up", "Rick Astley - Topic")).toEqual({
      artist: "Rick Astley",
      track: "Never Gonna Give You Up",
    })
  })
})

describe("lrc", () => {
  it("parses multi-stamp lines and enhanced words", () => {
    const parsed = parseLrc(
      [
        "[offset: 100]",
        "[00:12.00][00:45.00]Hello world",
        "[00:13.50]<00:13.50>one <00:14.00>two",
      ].join("\n"),
      120_000,
    )
    expect(parsed.synced).toBe(true)
    expect(parsed.lines.map((line) => line.startMs)).toEqual([12_100, 13_600, 45_100])
    expect(parsed.lines[0].text).toBe("Hello world")
    expect(parsed.lines[2].text).toBe("Hello world")
    expect(parsed.lines[1].words?.map((w) => w.text)).toEqual(["one", "two"])
  })

  it("caps long gaps so the wipe does not crawl through instrumentals", () => {
    const parsed = parseLrc(["[00:01.00]a", "[00:40.00]b"].join("\n"), 90_000)
    expect(parsed.lines[0].endMs - parsed.lines[0].startMs).toBeLessThan(6000)
  })

  it("spreads plain lyrics with paragraph pauses and shared choruses", () => {
    const parsed = parsePlainLyrics("one\ntwo\n\nchorus\n\nchorus", 100_000)
    expect(parsed.autoTimed).toBe(true)
    expect(parsed.lines).toHaveLength(4)
    expect(parsed.lines[0].startMs).toBeGreaterThan(0)
    expect(parsed.lines[3].endMs).toBeLessThan(100_000)
    const chorusSpans = parsed.lines
      .filter((l) => l.text === "chorus")
      .map((l) => l.endMs - l.startMs)
    expect(chorusSpans[0]).toBe(chorusSpans[1])
  })
})

describe("sync phases", () => {
  it("reports preamble before vocals and hold through short gaps", () => {
    const lines = [
      { startMs: 1000, endMs: 2000, text: "a", kind: "lyric" as const },
      { startMs: 1000 + HOLD_MS - 200, endMs: 5000, text: "b", kind: "lyric" as const },
    ]
    expect(getStageState(lines, 500).phase).toBe("preamble")
    expect(getStageState(lines, 1500).phase).toBe("active")
    expect(getStageState(lines, 1500).wipe).toBe(false)
    expect(getStageState(lines, 2200).phase).toBe("hold")
    expect(getActiveLineIndex(lines, 2200)).toBe(0)
  })

  it("enters gap on long instrumentals without wiping", () => {
    const lines = [
      { startMs: 1000, endMs: 2000, text: "a", kind: "lyric" as const },
      { startMs: 12_000, endMs: 13_000, text: "b", kind: "lyric" as const },
    ]
    const state = getStageState(lines, 5000)
    expect(state.phase).toBe("gap")
    expect(state.activeIndex).toBe(0)
    expect(state.wipe).toBe(false)
    expect(state.progress).toBe(1)
  })

  it("wipes only when word tags exist", () => {
    const lines = [
      {
        startMs: 1000,
        endMs: 3000,
        text: "one two",
        kind: "lyric" as const,
        words: [
          { text: "one", startMs: 1000, endMs: 2000 },
          { text: "two", startMs: 2000, endMs: 3000 },
        ],
      },
    ]
    const mid = getStageState(lines, 1500)
    expect(mid.wipe).toBe(true)
    expect(mid.progress).toBeGreaterThan(0)
    expect(mid.progress).toBeLessThan(1)
  })
})

describe("match", () => {
  it("prefers duration and synced lyrics", () => {
    const synced = {
      trackName: "Hello",
      artistName: "Adele",
      duration: 295,
      syncedLyrics: "[00:01.00]Hello",
      plainLyrics: "Hello",
    }
    const wrongMix = {
      trackName: "Hello",
      artistName: "Adele",
      duration: 420,
      syncedLyrics: "[00:01.00]Hello",
      plainLyrics: "Hello",
    }
    expect(scoreCandidate(synced, 297, "Adele", "Hello")).toBeLessThan(
      scoreCandidate(wrongMix, 297, "Adele", "Hello"),
    )
  })
})

describe("clock", () => {
  it("interpolates while playing and freezes while paused", () => {
    expect(interpolateClock(10, true, 1000, 1500)).toBeCloseTo(10.5)
    expect(interpolateClock(10, false, 1000, 1500)).toBe(10)
  })
})
