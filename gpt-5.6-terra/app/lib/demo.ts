import type { ParsedLyrics, TrackMetadata } from "~/lib/types"
import { parseLrc } from "~/lib/lrc"

export const DEMO_VIDEO_ID = "night-signal"
export const DEMO_TRACK: TrackMetadata = {
  title: "Night Signal",
  artist: "Umbra Studio",
  durationSec: 142,
  source: "demo session",
}

// Written for this demo. It gives the player a complete, offline-capable lyric
// path without embedding a copyrighted song in the product.
export const DEMO_LRC = `[ar:Umbra Studio]
[ti:Night Signal]
[offset:0]
[00:08.20]The room turns blue before the sound begins
[00:15.10]A small light travels underneath my skin
[00:22.40]I count the silence, let the ceiling spin
[00:29.70]Then your voice finds me again

[00:40.10]Hold the night signal close
[00:46.50]Let it rise, let it glow
[00:52.90]Every word has a way home
[00:59.30]When we sing it slow

[01:10.00]The city hums in colors we can hear
[01:17.20]A borrowed melody makes the distance clear
[01:24.50]We are here, we are here
[01:31.60]Nothing disappears

[01:41.00]Hold the night signal close
[01:47.30]Let it rise, let it glow
[01:53.70]Every word has a way home
[02:00.10]When we sing it slow`

export function demoLyrics(): ParsedLyrics {
  return parseLrc(DEMO_LRC, (DEMO_TRACK.durationSec ?? 142) * 1000)
}
