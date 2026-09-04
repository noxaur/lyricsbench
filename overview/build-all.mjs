import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { patchReactRouterConfig } from "./bench-adapt.mjs"
import { loadBenches } from "./bench-catalog.mjs"

const overviewDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(overviewDir, "..")
const overlayPath = path.join(overviewDir, "vite-bench.mjs")
const outBenchesDir = path.join(overviewDir, "dist", "benches")
const ssrMapPath = path.join(overviewDir, "api", "ssr-map.js")

function bin(dir, name) {
  const exe = path.join(dir, "node_modules", ".bin", name)
  if (!existsSync(exe)) throw new Error(`missing ${name} in ${dir}`)
  return exe
}

function run(dir, name, args, extraEnv = {}) {
  execFileSync(bin(dir, name), args, {
    cwd: dir,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  })
}

function withLocalViteConfig(benchDir, basePath, fn) {
  const file = path.join(benchDir, "vite.config.lyricsbench.mjs")
  writeFileSync(
    file,
    `process.env.LYRICSBENCH_DIR ??= ${JSON.stringify(benchDir)}\n` +
      `process.env.LYRICSBENCH_BASE ??= ${JSON.stringify(basePath)}\n` +
      `export { default } from ${JSON.stringify(overlayPath)}\n`,
  )
  try {
    return fn(file)
  } finally {
    try {
      unlinkSync(file)
    } catch {}
  }
}

function withPatchedReactRouterConfig(benchDir, basename, fn) {
  const file = ["react-router.config.ts", "react-router.config.js"]
    .map((n) => path.join(benchDir, n))
    .find((p) => existsSync(p))
  if (!file) return fn()
  const orig = readFileSync(file, "utf8")
  writeFileSync(file, patchReactRouterConfig(orig, basename))
  try {
    return fn()
  } finally {
    writeFileSync(file, orig)
  }
}

function writeSsrMap(ssrBenches) {
  mkdirSync(path.dirname(ssrMapPath), { recursive: true })
  const lines = ssrBenches.map(
    ({ slug, folder }) =>
      `  ${JSON.stringify(slug)}: () => import(${JSON.stringify(`../../${folder}/build/server/index.js`)}),`,
  )
  writeFileSync(
    ssrMapPath,
    `export const loadSsr = {\n${lines.join("\n")}\n}\n`,
  )
}

console.log("==> Building overview board...")
run(overviewDir, "tsc", ["--noEmit"])
run(overviewDir, "vite", ["build"])

const benches = loadBenches()
if (benches.length === 0) throw new Error("no benches in src/benches.ts")
console.log(`==> Found ${benches.length} benchmarks in benches.ts`)

mkdirSync(outBenchesDir, { recursive: true })
const ssrBenches = []

for (const { slug, folder, command } of benches) {
  const benchDir = path.join(rootDir, folder)
  const targetDir = path.join(outBenchesDir, slug)
  const basePath = `/benches/${slug}/`
  const basename = `/benches/${slug}`

  console.log(`\n==> [${slug}] Building (${command})...`)
  if (!existsSync(benchDir)) {
    throw new Error(`[${slug}] directory ${benchDir} does not exist`)
  }
  if (!existsSync(path.join(benchDir, "node_modules"))) {
    throw new Error(`[${slug}] node_modules missing — run overview/install-all.mjs`)
  }

  const env = { LYRICSBENCH_DIR: benchDir, LYRICSBENCH_BASE: basePath }
  let clientOutDir = "dist"

  withLocalViteConfig(benchDir, basePath, (configFile) => {
    if (command === "react-router") {
      withPatchedReactRouterConfig(benchDir, basename, () => {
        run(benchDir, "react-router", ["build", "--config", configFile], env)
      })
    } else {
      run(benchDir, "vite", ["build", "--config", configFile], env)
    }
  })

  if (command === "react-router") {
    clientOutDir = "build/client"
    const serverBuild = path.join(benchDir, "build/server/index.js")
    if (!existsSync(serverBuild)) {
      throw new Error(`[${slug}] missing ${serverBuild}`)
    }
    ssrBenches.push({ slug, folder })
  }

  const sourceClientDir = path.join(benchDir, clientOutDir)
  if (!existsSync(sourceClientDir)) {
    throw new Error(`[${slug}] missing client output ${sourceClientDir}`)
  }
  mkdirSync(targetDir, { recursive: true })
  cpSync(sourceClientDir, targetDir, { recursive: true })
}

writeSsrMap(ssrBenches)
console.log(`\n==> Wrote ${ssrBenches.length} SSR loader(s) to overview/api/ssr-map.js`)
console.log("==> All benchmarks built into overview/dist/benches")
