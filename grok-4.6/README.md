# umbra

A karaoke booth in the browser. Paste a YouTube or Spotify link, or search for a song, and sing against synced lyrics.

This is a from-scratch React Router rebuild of [noxaur/umbra-lyrics](https://github.com/noxaur/umbra-lyrics). The old app grew a 1,800-line player, two lyrics backends, and a pile of scrapers. This one keeps the product and changes the mechanics:

- **One lyrics path.** Duration-first LRCLIB lookup on the server, then ranked search, then lyrics.ovh. No scraper farm.
- **A clock outside React.** YouTube only samples a few times a second. The karaoke wipe interpolates between samples on animation frames, without putting `currentTime` in React state.
- **A lyric reel, not a scroller.** The active line is translated to optical center. Wheel to read ahead, then tap Follow. Gaps hold the last line instead of blanking the stage.
- **No metadata gate.** Search starts immediately. Wrong song? Tap the title and search again.

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
