# lyricsbench

A public board of karaoke-player implementations from frontier models.

Live: https://lyricsbench-psi.vercel.app

```bash
cd overview
pnpm ci
pnpm dev
```

Local `pnpm dev` still boots each model booth as a child process. Production is a single Vercel project: the overview app plus every folder listed in `overview/src/benches.ts`, built into `/benches/<slug>/`. React Router framework benches (SSR + `/api/*`) go through `api/bench.js`. Adding a model is: drop the folder, register it in `benches.ts`.

The Vercel **Root Directory** must be the repository root, not `overview/`. `vercel.json` at the repo root runs `node overview/install-all.mjs` then `node overview/build-all.mjs`.

`pnpm install` in `overview` points git at `.githooks/`. Commits run lint + check. Pushes run `pnpm ci` + verify locally. GitHub only kicks production on Vercel — no install, lint, or build on the runner.
