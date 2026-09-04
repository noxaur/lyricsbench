import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { adaptSource, patchReactRouterConfig, publicBenchUrl } from "./bench-adapt.mjs"
import { loadBenches } from "./bench-catalog.mjs"

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

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log(`ok platform ${benches.length} benches`)
