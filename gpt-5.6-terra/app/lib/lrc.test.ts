import { describe, expect, it } from "vitest"
import { currentLineIndex, parseLrc, parsePlainLyrics, parseTimestamp } from "~/lib/lrc"

describe("LRC parsing", () => {
  it("expands repeated timestamp tags and honors an offset", () => {
    const parsed = parseLrc("[offset:100]\n[00:01.00][00:04.00]repeat me", 10_000)
    expect(parsed.synced).toBe(true)
    expect(parsed.lines.map((line) => line.startMs)).toEqual([1_100, 4_100])
    expect(parsed.lines.map((line) => line.text)).toEqual(["repeat me", "repeat me"])
  })

  it("reads both centisecond and hour timestamps", () => {
    expect(parseTimestamp("01:02:50")).toBe(62_500)
    expect(parseTimestamp("01:02:03.50")).toBe(3_723_500)
  })

  it("keeps enhanced-LRC word timings for a word-level reveal", () => {
    const parsed = parseLrc("[00:10.00]<00:10.00>sing <00:10.50>along", 20_000)
    expect(parsed.lines[0].text).toBe("sing along")
    expect(parsed.lines[0].words).toEqual([
      { text: "sing ", startMs: 10_000, endMs: 10_500 },
      { text: "along", startMs: 10_500, endMs: undefined },
    ])
  })

  it("finds the latest started line through a gap", () => {
    const parsed = parseLrc("[00:01.00]first\n[00:08.00]second", 12_000)
    expect(currentLineIndex(parsed.lines, 500)).toBe(-1)
    expect(currentLineIndex(parsed.lines, 5_000)).toBe(0)
    expect(currentLineIndex(parsed.lines, 8_100)).toBe(1)
  })

  it("assigns readable guide timing for plain lyric sheets", () => {
    const parsed = parsePlainLyrics("one\ntwo\nthree", 90_000)
    expect(parsed.autoTimed).toBe(true)
    expect(parsed.lines).toHaveLength(3)
    expect(parsed.lines[0].startMs).toBeGreaterThan(0)
    expect(parsed.lines[2].endMs).toBeLessThanOrEqual(90_000)
  })
})
