# Production Incident Analysis: Benchmark Pages JSON Parse Error

**Target URL:** [https://lyricsbench-psi.vercel.app/](https://lyricsbench-psi.vercel.app/)  
**Date:** September 4, 2026  
**Status:** Root cause identified; no code modified per instructions.

---

## 1. Executive Summary

When visiting any benchmark page in production (e.g., [`/b/gemini-3.8-flash`](https://lyricsbench-psi.vercel.app/b/gemini-3.8-flash)), the page displays:
> **Could not load [Model Name]**  
> `Unexpected token '<', "<!doctype "... is not valid JSON` (or browser equivalent JSON parser error)

The issue is caused by an architectural mismatch between the local development environment and the static production deployment on Vercel:

1. **Client Expectation:** The React component [`src/pages/stage.tsx`](file:///Users/per/Code/bench/lyricsbench/overview/src/pages/stage.tsx) performs a `fetch('/__bench/' + slug)` call expecting a JSON response `{ url: string }`.
2. **Missing Production Backend:** The endpoint `/__bench/:slug` was implemented exclusively as a **Vite dev server middleware hook** (`configureServer`) inside [`overview/plugin-benches.ts`](file:///Users/per/Code/bench/lyricsbench/overview/plugin-benches.ts). Vite dev middleware **never runs in production** (`vite build` / Vercel).
3. **Vercel Catch-All SPA Rewrite:** [`overview/vercel.json`](file:///Users/per/Code/bench/lyricsbench/overview/vercel.json) rewrites all unmatched routes `/(.*)` to `/index.html`. Consequently, Vercel responds to `GET /__bench/:slug` with `200 OK` and the HTML content of `index.html`.
4. **JSON Parser Crash:** `stage.tsx` calls `await res.json()` on the response. Since the response body is HTML starting with `<!doctype html>`, the browser's JSON parser throws a syntax error, which is caught and displayed to the user as a fault.

---

## 2. Detailed Root Cause Analysis

### Step 1: User navigates to a benchmark page
When clicking on a model card from the overview board or opening `/b/gemini-3.8-flash`:
- React Router matches the path to [`src/pages/stage.tsx`](file:///Users/per/Code/bench/lyricsbench/overview/src/pages/stage.tsx).
- In `stage.tsx` (lines 43–64):
```tsx
useEffect(() => {
  if (!bench) return
  const ac = new AbortController()
  setStatus({ kind: "cueing" })

  fetch(`/__bench/${encodeURIComponent(bench.slug)}`, { signal: ac.signal })
    .then(async (res) => {
      const body = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !body.url) {
        throw new Error(body.error || `could not start ${bench.name}`)
      }
      setStatus({ kind: "live", url: body.url })
    })
    .catch((err: unknown) => {
      if (ac.signal.aborted) return
      setStatus({
        kind: "fault",
        message: err instanceof Error ? err.message : "could not start this model booth",
      })
    })

  return () => ac.abort()
}, [bench])
```

### Step 2: The request goes to `https://lyricsbench-psi.vercel.app/__bench/gemini-3.8-flash`
In local development (`pnpm dev`), Vite runs [`overview/plugin-benches.ts`](file:///Users/per/Code/bench/lyricsbench/overview/plugin-benches.ts):
```ts
export function benchesPlugin(): Plugin {
  ...
  return {
    name: "lyricsbench-benches",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? ""
        const match = pathname.match(/^\/__bench\/([^/]+)$/)
        if (req.method !== "GET" || !match) {
          next()
          return
        }
        ...
```
- `configureServer` only runs in `vite` dev mode.
- In production, `pnpm build` (`vite build`) generates pure static assets into `overview/dist/`.
- None of the Node.js dev server middleware code exists on Vercel.

### Step 3: Vercel rewrites `/__bench/*` to `index.html`
In [`overview/vercel.json`](file:///Users/per/Code/bench/lyricsbench/overview/vercel.json):
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "vite",
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "installCommand": "pnpm ci",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "git": {
    "deploymentEnabled": false
  }
}
```
Because no static file matches `/__bench/gemini-3.8-flash`, Vercel applies the rewrite rule:
- HTTP Status: `200 OK`
- Header: `Content-Type: text/html; charset=utf-8`
- Body: `<!doctype html><html lang="en">...`

### Step 4: `res.json()` fails to parse HTML
Because the response status is `200 OK`, `res.ok` is `true`.
The browser executes:
```ts
const body = (await res.json())
```
The browser's JSON engine encounters `<` (the start of `<!doctype html>`) where it expects valid JSON (`{`, `[`, `"`, number, etc.).
It throws:
```text
SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```
The error triggers the `.catch()` handler, setting status to `kind: "fault"` and rendering:
```tsx
<div className="stage-fault">
  <h1>Could not load {currentDisplayName}</h1>
  <p>{status.message}</p>
</div>
```

---

## 3. Why the CI Smoke Test Didn't Catch This

The GitHub Actions CI workflow [`.github/workflows/overview.yml`](file:///Users/per/Code/bench/lyricsbench/.github/workflows/overview.yml) executes [`overview/smoke.mjs`](file:///Users/per/Code/bench/lyricsbench/overview/smoke.mjs):
```js
for (const p of ["/", "/b/grok-4.6"]) {
  const res = await fetch(base + p)
  const html = await res.text()
  if (!res.ok) throw new Error(`${p} → ${res.status}`)
  if (!html.includes('id="root"') || !html.includes("lyricsbench")) {
    throw new Error(`${p} did not look like the overview`)
  }
}
```
1. `smoke.mjs` spins up `vite preview` and fetches `/` and `/b/grok-4.6` over HTTP.
2. It only checks `res.text()` for `id="root"` and `"lyricsbench"`.
3. It **does not run a headless browser** (such as Playwright or Puppeteer) to execute client-side JavaScript.
4. It never called `/__bench/:slug` or evaluated the React component lifecycle.
5. Because `vite preview` serves `index.html` with `id="root"` for `/b/grok-4.6`, the smoke test reported `ok smoke` and allowed deployment.

---

## 4. Fundamental Architectural Issue

In local development, `plugin-benches.ts` relies on Node.js process orchestration:
- When a user visits a bench, `startBench()` calls `child_process.spawn("npx", ["vite" / "react-router", "--port", ...])`.
- It spins up a local dev server bound to `127.0.0.1:<allocated_port>` on the developer's laptop.
- It returns `{ url: "http://127.0.0.1:<port>" }` for the overview page's `<iframe>` to embed.

In production on Vercel:
- Vercel hosting for `overview` is a **static web deployment** (`outputDirectory: "dist"`).
- A static host cannot spawn on-demand Node processes or run dev servers.
- Even if a backend process was running on a server, returning `http://127.0.0.1` would attempt to connect to the visitor's local machine, not the server.
- Furthermore, one of the benches ([`grok-4.6`](file:///Users/per/Code/bench/lyricsbench/grok-4.6/package.json)) uses React Router 8 Framework with server API routes (`app/routes/api.*.ts`), while others (`gemini-3.8-flash`, `mimo-v2.5`, `muse-spark-*`) are Vite single-page applications.

---

## 5. Recommended Solutions

To make benchmark pages function in production, the architecture needs to be updated:

### Option 1: Multi-project Vercel Deployment (Recommended)
Deploy each benchmark project to its own Vercel deployment (or subdomain):
- `gemini.lyricsbench.vercel.app` (or `gemini-3-8-flash.lyricsbench.vercel.app`)
- `grok.lyricsbench.vercel.app`
- `mimo.lyricsbench.vercel.app`
- `muse-1-2.lyricsbench.vercel.app`
- `muse-1-3.lyricsbench.vercel.app`

Then update [`overview/src/benches.ts`](file:///Users/per/Code/bench/lyricsbench/overview/src/benches.ts) to define static production URLs (or environment-based URLs):
```ts
export type Bench = {
  slug: string
  name: string
  folder: string
  router: string
  routes: string[]
  command: BenchCommand
  productionUrl?: string
}
```
In [`src/pages/stage.tsx`](file:///Users/per/Code/bench/lyricsbench/overview/src/pages/stage.tsx):
- If `import.meta.env.PROD` and `bench.productionUrl`, load `bench.productionUrl` directly into the iframe without fetching `/__bench/:slug`.
- Only fetch `/__bench/:slug` when running in local dev mode (`import.meta.env.DEV`).

### Option 2: Prebuild Static Benches into Subdirectories (For client-only apps)
If the benchmarks can be built as static SPAs:
1. Update each benchmark app to build with a base path (e.g. `base: "/benches/gemini-3.8-flash/"`).
2. Build each app during the overview build script:
   ```bash
   pnpm --filter gemini-3.8-flash build
   cp -r ../gemini-3.8-flash/dist dist/benches/gemini-3.8-flash
   ```
3. Set the iframe `src` directly to `/benches/${bench.slug}/index.html`.
*(Note: For `grok-4.6`, server features/API routes would need client-side polyfills or static prerendering).*

### Option 3: Production Vercel Rewrites
Configure `vercel.json` to proxy benchmark paths to independent Vercel deployments:
```json
{
  "rewrites": [
    { "source": "/benches/gemini-3.8-flash/:path*", "destination": "https://gemini-bench.vercel.app/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
