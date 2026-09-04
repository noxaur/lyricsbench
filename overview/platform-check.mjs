import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { adaptSource, patchReactRouterConfig, publicBenchUrl } from "./bench-adapt.mjs"
import { loadBenches } from "./bench-catalog.mjs"
import {
  mapPool,
  restoreBenchArtifacts,
  saveBenchArtifacts,
  shouldSkipInstall,
  sourceHash,
  stampMatches,
  writeStamp,
} from "./build-cache.mjs"

const overviewDir = path.dirname(fileURLToPath(import.meta.url))

const failures = []

function assert(cond, message) {
  if (!cond) failures.push(message)
}

const benches = loadBenches()
assert(benches.length >= 5, `expected at least 5 benches, got ${benches.length}`)
assert(
  benches.every((b) => b.slug && b.folder && (b.command === "vite" || b.command === "react-router")),
  "every bench needs slug, folder, and a known command",
)
assert(
  benches.some((b) => b.command === "react-router"),
  "expected at least one react-router SSR bench",
)

const cbr = `import { createBrowserRouter, RouterProvider } from "react-router";
const router = createBrowserRouter([]);`
const cbrOut = adaptSource(cbr, "/tmp/main.tsx")
assert(cbrOut?.includes("__lb_cbr"), "createBrowserRouter wrapper missing")
assert(cbrOut?.includes("basename:"), "createBrowserRouter basename missing")

const br = `import { BrowserRouter } from "react-router-dom"
export function A() { return <BrowserRouter><div /></BrowserRouter> }`
const brOut = adaptSource(br, "/tmp/App.tsx")
assert(brOut?.includes("basename={import.meta.env.BASE_URL}"), "BrowserRouter basename missing")

const fetchOut = adaptSource(`fetch("/api/search?q=a")`, "/tmp/api.ts")
assert(fetchOut?.includes("BASE_URL"), "API fetch was not prefixed")

const skipped = adaptSource(`fetch("/api/search")`, "/tmp/node_modules/react-router/index.js")
assert(skipped === null, "node_modules sources should not be adapted")

const url = publicBenchUrl(
  "https://lyricsbench-psi.vercel.app/api/bench?slug=grok-4.6&path=api/search&q=hi",
  "grok-4.6",
  "api/search",
)
assert(url.pathname === "/benches/grok-4.6/api/search", `pathname ${url.pathname}`)
assert(url.searchParams.get("q") === "hi", "original query was dropped")
assert(!url.searchParams.has("slug") && !url.searchParams.has("path"), "rewrite params leaked")

const root = publicBenchUrl("https://x.test/api/bench?slug=gemini-3.8-flash", "gemini-3.8-flash", "")
assert(root.pathname === "/benches/gemini-3.8-flash/", `root pathname ${root.pathname}`)

const patched = patchReactRouterConfig(`export default {\n  ssr: true,\n} satisfies Config;\n`, "/benches/grok-4.6")
assert(patched.includes('basename: "/benches/grok-4.6"'), "rr config basename missing")
assert(patched.includes('mode: "initial"'), "rr config should disable lazy manifest")

const labsSrc = readFileSync(path.join(overviewDir, "src/labs.tsx"), "utf8")
assert(labsSrc.includes('id: "cursor"'), "Cursor lab missing from the model picker")
assert(labsSrc.includes('slug: "composer-2.5"'), "Composer 2.5 missing from Cursor")
assert(labsSrc.includes('slug: "grok-4.5"'), "Grok 4.5 missing from xAI")
assert(labsSrc.includes('slug: "gpt-5.6-terra"'), "GPT-5.6 Terra missing from OpenAI")
assert(labsSrc.includes("GPT 5.6 Luna"), "GPT 5.6 Luna missing from OpenAI")
assert(labsSrc.includes('id: "soul"'), "Soul missing from Anthropic")
assert(!labsSrc.includes("gpt-5.6-soul"), "Soul should only live under Anthropic")
assert(!labsSrc.includes("Muse Spark 2.0"), "Muse Spark 2.0 should be gone")
assert(!labsSrc.includes("gemini-3.8-pro"), "Gemini 3.8 Pro should be gone")
assert(labsSrc.indexOf("grok-4.5") < labsSrc.indexOf("composer-2.5"), "xAI should sit next to Cursor")

const installer = readFileSync(path.join(overviewDir, "install-all.mjs"), "utf8")
assert(
  installer.includes("falling back to npm install"),
  "install-all must survive stale booth lockfiles on Vercel",
)
assert(installer.includes("prefer-offline"), "install-all should reuse the npm/pnpm cache")
assert(installer.includes("shouldSkipInstall"), "install-all should skip when node_modules is reusable")

const builder = readFileSync(path.join(overviewDir, "build-all.mjs"), "utf8")
assert(builder.includes("restoreBenchArtifacts"), "build-all should reuse unchanged bench outputs")
assert(builder.includes("mapPool"), "build-all should build independent benches in parallel")

const tmp = mkdtempSync(path.join(os.tmpdir(), "lb-cache-"))
const vercelWas = process.env.VERCEL
const noCacheWas = process.env.LYRICSBENCH_NO_CACHE
try {
  delete process.env.VERCEL
  delete process.env.LYRICSBENCH_NO_CACHE
  const pkg = path.join(tmp, "app")
  mkdirSync(path.join(pkg, "src"), { recursive: true })
  writeFileSync(path.join(pkg, "package.json"), `{"name":"x"}`)
  writeFileSync(path.join(pkg, "src", "index.js"), "a")
  const h1 = sourceHash(pkg)
  writeFileSync(path.join(pkg, "src", "index.js"), "b")
  assert(sourceHash(pkg) !== h1, "sourceHash should change when a file changes")
  writeFileSync(path.join(pkg, "src", "index.js"), "a")
  mkdirSync(path.join(pkg, "node_modules"), { recursive: true })
  writeFileSync(path.join(pkg, "node_modules", "skip.js"), "nope")
  mkdirSync(path.join(pkg, "dist"), { recursive: true })
  writeFileSync(path.join(pkg, "dist", "index.html"), "built")
  assert(sourceHash(pkg) === h1, "sourceHash should ignore node_modules and dist")

  writeStamp(pkg)
  assert(stampMatches(pkg), "stamp should match after write")
  writeFileSync(path.join(pkg, "package.json"), `{"name":"y"}`)
  assert(!stampMatches(pkg), "stamp should miss after package.json change")
  assert(shouldSkipInstall(pkg), "local installs skip whenever node_modules exists")

  process.env.VERCEL = "1"
  assert(!shouldSkipInstall(pkg), "Vercel should not skip without a matching stamp and .bin")
  writeFileSync(path.join(pkg, "package.json"), `{"name":"x"}`)
  mkdirSync(path.join(pkg, "node_modules", ".bin"), { recursive: true })
  writeStamp(pkg)
  assert(shouldSkipInstall(pkg), "Vercel should skip when the lockfile stamp matches")
  process.env.LYRICSBENCH_NO_CACHE = "1"
  assert(!shouldSkipInstall(pkg), "LYRICSBENCH_NO_CACHE should force a reinstall")
  delete process.env.LYRICSBENCH_NO_CACHE

  const cacheRoot = path.join(tmp, "cache-root")
  const client = path.join(tmp, "client-src")
  const server = path.join(tmp, "server-src")
  mkdirSync(client, { recursive: true })
  mkdirSync(server, { recursive: true })
  writeFileSync(path.join(client, "index.html"), "hello")
  writeFileSync(path.join(server, "index.js"), "export default {}")
  saveBenchArtifacts(cacheRoot, "demo", "abc", { clientDir: client, serverDir: server })
  const clientDest = path.join(tmp, "client-dest")
  const serverDest = path.join(tmp, "server-dest")
  assert(restoreBenchArtifacts(cacheRoot, "demo", "abc", { clientDir: clientDest, serverDir: serverDest }), "restore should hit")
  assert(readFileSync(path.join(clientDest, "index.html"), "utf8") === "hello", "restored client")
  assert(readFileSync(path.join(serverDest, "index.js"), "utf8") === "export default {}", "restored server")
  assert(!restoreBenchArtifacts(cacheRoot, "demo", "zzz", { clientDir: clientDest, serverDir: serverDest }), "wrong hash should miss")

  const pooled = await mapPool([1, 2, 3], 2, async (n) => n * 2)
  assert(JSON.stringify(pooled) === "[2,4,6]", "mapPool should preserve order")
} finally {
  if (vercelWas === undefined) delete process.env.VERCEL
  else process.env.VERCEL = vercelWas
  if (noCacheWas === undefined) delete process.env.LYRICSBENCH_NO_CACHE
  else process.env.LYRICSBENCH_NO_CACHE = noCacheWas
  rmSync(tmp, { recursive: true, force: true })
}

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log(`ok platform ${benches.length} benches`)
