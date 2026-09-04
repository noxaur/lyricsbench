# umbra

A karaoke booth in the browser. Paste a YouTube or Spotify link, or search for a song, and sing against synced lyrics.

Fresh React Router rebuild of [noxaur/umbra-lyrics](https://github.com/noxaur/umbra-lyrics). The old app stacked scrapers, dual backends, and an 1,800-line player. This one keeps the product and replaces the mechanics:

- **Stage phases, not a boolean.** The sync engine reports `preamble` / `active` / `hold` / `gap`, so intros show a cue, short pauses keep the last line lit without wiping, and long instrumentals stop the fake karaoke wipe.
- **Snap vs wipe.** Line-level LRC snaps the highlight. Enhanced word tags wipe. Plain text never fakes a word wipe.
- **Paragraph-aware auto-timing.** Blank lines borrow pause budget; repeated chorus lines share duration; the outro stays reserved.
- **A clock outside React.** YouTube samples slowly. Karaoke progress interpolates on animation frames without putting `currentTime` in React state.
- **One lyrics path.** Duration-first LRCLIB on the server, ranked search, then lyrics.ovh. Offset is stored per video.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

```bash
npm test
npm run typecheck
```

## Shortcuts

Space play/pause. Left/right seek 5s. +/- nudge lyric timing by 0.5s. Tap a line to seek.

## Notes

Lyrics come from [LRCLIB](https://lrclib.net). Playback is a YouTube embed. Playlists and recents stay in this browser.
