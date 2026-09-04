# umbra — fresh React Router rebuild

A client-side karaoke player rebuilt from scratch with **React Router 7 + Vite + Tailwind 4**.  
Paste a YouTube link → synced lyrics from [LRCLIB](https://lrclib.net) → sing along with word-level highlight.

> This is a **novel re-implementation** of [noxaur/umbra-lyrics](https://github.com/noxaur/umbra-lyrics) that fixes the previous generation's bugs with simpler, invented approaches (see Architecture below).

## Quick start

```bash
npm install
npm run dev    # http://127.0.0.1:5173
npm run build  # typecheck + vite build
npm run preview
```

## Routes

| Path | Element |
|------|---------|
| `/` | Home — search + paste URL + recent |
| `/play/:videoId` | Player — YouTube + lyrics stage + transport |
| `/watch?v=ID` | Redirect to `/play/:videoId` |

## Novel fixes vs legacy umbra

| Legacy bug | Legacy cause | Novel fix in this rebuild |
|---|---|---|
| **S1 Long instrumental slow wipe** | `endMs = next.startMs` made 20s verse stay active | Cap line to **8s max**, gap >6s → `♪ Instrumental ♪` placeholder, no wipe |
| **S3 Offset leaks across songs** | Single `syncOffsetMs` global | **Per-video map** `offsetByVideo[videoId]` persisted as `umbra-offsets-v2` |
| **S4 Cryptic offset controls** | Unlabelled −0.5s/0.5s buttons | Labelled **Sync group** with slider, `aria-valuetext`, and Reset |
| **S5 Unsynced still wipes** | `parsePlainLyrics` set `synced=false` but stage still wiped | `autoTimed` → dashed border + “estimated” badge, no clip-path |
| **S7/S8 No TV/Focus mode** | Header + transport always visible | **TV mode** (`F` key) → fullscreen lyrics, hidden chrome |
| **Phantom focus / tab order** | `AnimatedIcon` injected `tabindex=0` on decorative spans; N lyric buttons | Real `<button>` only, **roving tabindex** (only active is tabbable), `inert` when video hidden |
| **No live region** | Active line change silent | `aria-live="polite"` sr-only that announces new line (350ms debounce) |
| **COEP breaks YouTube in VM** | Global `credentialless` + COEP headers | **No COEP headers in dev**, `youtube-nocookie.com` embed without `credentialless` |
| **1822-line player-page** | Mixed orchestration, 5 abort refs, stale closures | **~250-line player** with single `AbortController` + explicit state machine |
| **16-provider proxy chain** | High flake, Rust gateway + legacy worker | **Direct LRCLIB** (`/api/get` → `/api/search`) with 24h local cache |
| **Build needs Rust 1.85 + wasm** | `worker-build` required | No Rust, pure TS — `npm run build` just `tsc && vite build` |

## Project structure

```
src/
  lib/
    youtube.ts    # URL → videoId, embedUrl (isolation-aware)
    lrc.ts        # unified LRC + plain parser, gap caps, word timings
    sync.ts       # stage engine (intro/gap/lyric/outro)
    lrclib.ts     # direct LRCLIB with memory+LS cache
    parse-title.ts# YouTube title → {artist,track}
    recent.ts     # localStorage recent songs
  stores/
    player.ts     # zustand with per-video offsets
  hooks/
    use-youtube-player.ts # iframe postMessage + rAF poll
    use-lyrics-sync.ts    # clock extrapolator
  components/
    lyrics-stage.tsx      # virtual-friendly, live region, gap placeholders
    lyric-line.tsx        # clip-path wipe, reduced-motion, autoTimed style
    transport.tsx         # seek + labelled Sync group + TV toggle
    app-shell.tsx         # header + theme + skip link
  pages/
    home.tsx
    player.tsx    # 250 lines vs 1822: abortable loader, honest errors
  App.tsx
  main.tsx
```

## Theme

OKLCH tokens, DM Sans Variable, dark-first. `--karaoke-stage-bg` is the stage floor, `--karaoke-active` is the only saturated accent (Lyrics Star Rule).

## Accessibility

- Visible `<label>` on URL input, `aria-invalid` + `role=alert` on error
- `aria-valuetext` on seek, `aria-label` with seconds on offset slider
- `prefers-reduced-motion` disables pulse, smooth scroll, and scale
- Skip-to-content link, focus rings, `inert` on hidden video pane

## License

MIT — Lyrics data from LRCLIB, please respect their API guidelines.
