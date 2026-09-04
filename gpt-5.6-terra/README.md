# Umbra — fresh React Router rebuild

A lyrics-first karaoke player rebuilt from the public Umbra reference as a small React Router framework app.

```bash
npm install
npm run dev
```

Open `/` to search, paste a YouTube/Spotify track link, or launch the offline **Night Signal** demo. The player route is `/play/:videoId`; `/watch?v=<id>` remains a safe redirect for familiar YouTube-style links.

## What changed

- Route-local player state replaces a global playback/lyrics store.
- Lyrics lookup has both an `AbortController` and a generation guard, so a late request cannot overwrite a newly opened track or pasted sheet.
- The LRC parser handles metadata, offsets, repeated time tags, three-part timestamps, enhanced word tags, and a transparent plain-lyrics timing fallback.
- A single media contract supports both the YouTube iframe API and an offline demo clock, letting the real karaoke behavior work during outages and in restricted environments.
- API routes isolate oEmbed, Spotify matching, YouTube search, and LRCLIB access from the browser UI.

Run `npm run typecheck`, `npm test`, and `npm run build` before shipping.
