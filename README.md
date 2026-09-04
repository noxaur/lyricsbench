# lyricsbench

A public board of karaoke-player implementations from frontier models.

Live: https://lyricsbench-psi.vercel.app

```bash
cd overview
pnpm ci
pnpm dev
```

Pushes to `main` run lint, a bench inventory check, a production build, and a smoke test against the built site. Vercel production updates only after those pass.
