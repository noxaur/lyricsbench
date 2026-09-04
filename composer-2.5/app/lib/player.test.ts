import { describe, expect, it } from "vitest"
import { interpolateClock } from "./clock"
import { parseLrc, parsePlainLyrics } from "./lrc"
import { scoreCandidate } from "./match"
import { getActiveLineIndex, getLineProgress, getStageState } from "./sync"
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

  it("parses centisecond colon stamps", () => {
    const parsed = parseLrc("[01:02:50]Chorus", 120_000)
    expect(parsed.lines[0].startMs).toBe(62_500)
  })

  it("parses hour stamps with fractions", () => {
    const parsed = parseLrc("[01:02:03.50]Long song", 3_723_500)
    expect(parsed.lines[0].startMs).toBe(3_723_500)
  })

  it("spreads plain lyrics across the song", () => {
    const parsed = parsePlainLyrics("one\ntwo\nthree", 100_000)
    expect(parsed.autoTimed).toBe(true)
    expect(parsed.lines).toHaveLength(3)
    expect(parsed.lines[0].startMs).toBeGreaterThan(0)
    expect(parsed.lines[2].endMs).toBeLessThan(100_000)
  })
})

describe("sync", () => {
  it("holds the last started line through gaps", () => {
    const lines = [
      { startMs: 1000, endMs: 2000, text: "a", kind: "lyric" as const },
      { startMs: 8000, endMs: 9000, text: "b", kind: "lyric" as const },
    ]
    expect(getActiveLineIndex(lines, 500)).toBe(-1)
    expect(getActiveLineIndex(lines, 1500)).toBe(0)
    expect(getActiveLineIndex(lines, 5000)).toBe(0)
    expect(getActiveLineIndex(lines, 8100)).toBe(1)
    expect(getLineProgress(lines[0], 1500)).toBe(0.5)
    expect(getStageState(lines, 5000).progress).toBe(1)
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
