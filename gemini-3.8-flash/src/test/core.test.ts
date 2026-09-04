import { test, expect } from "vitest"

import { parseLrc, parsePlainLyrics, parseWordTimings } from "../lib/lrc-parser"
import { calculateAnchorOffset } from "../lib/sync-calibration"
import { detectScriptAndLanguage } from "../lib/language-detector"
import { toRomaji } from "../lib/romaji-service"
import { extractVideoId } from "../lib/youtube-search"

test("LRC Parser - Standard LRC timestamps", () => {
  const sample = `
[00:12.34]First line of lyrics
[00:16.80]Second line of lyrics
[00:20.50]Third line of lyrics
  `
  const parsed = parseLrc(sample, 60, 0)
  expect(parsed.synced).toBe(true)
  expect(parsed.lines.length).toBe(3)
  expect(parsed.lines[0].text).toBe("First line of lyrics")
  expect(parsed.lines[0].startMs).toBe(12340)
  expect(parsed.lines[1].startMs).toBe(16800)
  expect(parsed.lines[2].startMs).toBe(20500)
})

test("LRC Parser - Hour formatted timestamps", () => {
  const sample = `[01:02:03.50]Deep into the concert`
  const parsed = parseLrc(sample, 4000)
  expect(parsed.lines.length).toBe(1)
  expect(parsed.lines[0].startMs).toBe(1 * 3600000 + 2 * 60000 + 3500)
})

test("LRC Parser - Section markers and offsets", () => {
  const sample = `
[offset: +200]
[00:05.00]Intro line
[Chorus]
[00:10.00]Chorus line
  `
  const parsed = parseLrc(sample, 30)
  expect(parsed.lines.length).toBe(3)
  expect(parsed.lines[0].startMs).toBe(5200) // 5000 + 200
  expect(parsed.lines[1].kind).toBe("section")
  expect(parsed.lines[1].sectionLabel).toBe("Chorus")
  expect(parsed.lines[2].startMs).toBe(10200) // 10000 + 200
})

test("LRC Parser - Enhanced word timestamps", () => {
  const line = "<00:01.00>Never <00:02.00>gonna <00:03.00>give"
  const words = parseWordTimings(line, 1000, 4000)
  expect(words.length).toBe(3)
  expect(words[0].text).toBe("Never")
  expect(words[0].startMs).toBe(1000)
  expect(words[1].text).toBe("gonna")
  expect(words[1].startMs).toBe(2000)
  expect(words[2].text).toBe("give")
  expect(words[2].startMs).toBe(3000)
})

test("LRC Parser - Plain text fallback", () => {
  const plain = `Line one\nLine two\nLine three`
  const parsed = parsePlainLyrics(plain, 12)
  expect(parsed.synced).toBe(false)
  expect(parsed.lines.length).toBe(3)
  expect(parsed.lines[0].startMs).toBe(0)
  expect(parsed.lines[1].startMs).toBe(4000)
  expect(parsed.lines[2].startMs).toBe(8000)
})

test("Sync Engine - Issue #78 Anchor calculation", () => {
  // If line was originally at 10,000ms, but audio is currently at 12,500ms
  // User clicks Anchor -> offset should be +2500ms so line shifts to 12,500ms
  const lineOriginalStartMs = 10000
  const currentPlaybackMs = 12500
  const offset = calculateAnchorOffset(lineOriginalStartMs, currentPlaybackMs)
  expect(offset).toBe(2500)
})

test("Language Detection - Issue #77 Smart Detection", () => {
  const englishSample = "We are no strangers to love, you know the rules and so do I"
  const japaneseSample = "夢ならばどれほどよかったでしょう 未だにあなたのことを夢にみる"
  const koreanSample = "아무것도 생각하지 마 넌 아무 말도 꺼내지도 마"

  const enDet = detectScriptAndLanguage(englishSample)
  expect(enDet.isEnglish).toBe(true)
  expect(enDet.hasCjk).toBe(false)

  const jaDet = detectScriptAndLanguage(japaneseSample)
  expect(jaDet.isEnglish).toBe(false)
  expect(jaDet.hasCjk).toBe(true)

  const koDet = detectScriptAndLanguage(koreanSample)
  expect(koDet.isEnglish).toBe(false)
  expect(koDet.hasHangul).toBe(true)
})

test("Romaji Transliteration - Client-side Hepburn Engine", () => {
  expect(toRomaji("ゆめ")).toBe("yume")
  expect(toRomaji("レモン")).toBe("remon")
  expect(toRomaji("とうきょう")).toBe("toukyou")
  expect(toRomaji("ずっと")).toBe("zutto")
  expect(toRomaji("きょう")).toBe("kyou")
})

test("Search & Extraction - Direct Video ID and URL parsing", () => {
  expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
})
