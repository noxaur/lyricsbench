# lyricsbench

A public board of karaoke-player implementations from frontier models.

Live: https://lyricsbench-psi.vercel.app

```bash
cd overview
pnpm ci
pnpm dev
```

`pnpm install` points git at `.githooks/`. Commits run lint + check; pushes run the full verify (lint, check, build, smoke). Vercel production updates from `main` after a push that passed those hooks.
