# lyricsbench

A public board of karaoke-player implementations from frontier models.

Live: https://lyricsbench-psi.vercel.app

```bash
cd overview
pnpm ci
pnpm dev
```

`pnpm install` points git at `.githooks/`. Commits run lint + check. Pushes run `pnpm ci` + verify locally, and a push of `main` deploys production from this machine.
