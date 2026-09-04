import { spawn } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { patchReactRouterConfig } from "./bench-adapt.mjs"
import { loadBenches } from "./bench-catalog.mjs"
import { jobCount, mapPool, restoreBenchArtifacts, saveBenchArtifacts, sourceHash } from "./build-cache.mjs"

const overviewDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(overviewDir, "..")
const overlayPath = path.join(overviewDir, "vite-bench.mjs")
const adaptPath = path.join(overviewDir, "bench-adapt.mjs")
const outBenchesDir = path.join(overviewDir, "dist", "benches")
const ssrMapPath = path.join(overviewDir, "api", "ssr-map.js")

function bin(dir, name) {
  const exe = path.join(dir, "node_modules", ".bin", name)
  if (!existsSync(exe)) throw new Error(`missing ${name} in ${dir}`)
  return exe
}

function run(dir, name, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin(dir, name), args, {
      cwd: dir,
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${name} exited ${code} in ${dir}`))
    })
  })
}

async function withLocalViteConfig(benchDir, basePath, fn) {
  const file = path.join(benchDir, "vite.config.lyricsbench.mjs")
  writeFileSync(
    file,
    `process.env.LYRICSBENCH_DIR ??= ${JSON.stringify(benchDir)}\n` +
      `process.env.LYRICSBENCH_BASE ??= ${JSON.stringify(basePath)}\n` +
      `export { default } from ${JSON.stringify(overlayPath)}\n`,
  )
  try {
    return await fn(file)
  } finally {
    try {
      unlinkSync(file)
    } catch {}
  }
}

async function withPatchedReactRouterConfig(benchDir, basename, fn) {
  const file = ["react-router.config.ts", "react-router.config.js"]
    .map((n) => path.join(benchDir, n))
    .find((p) => existsSync(p))
  if (!file) return fn()
  const orig = readFileSync(file, "utf8")
  writeFileSync(file, patchReactRouterConfig(orig, basename))
  try {
    return await fn()
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

function copyClient(sourceClientDir, targetDir) {
  if (!existsSync(sourceClientDir)) {
    throw new Error(`missing client output ${sourceClientDir}`)
  }
  mkdirSync(targetDir, { recursive: true })
  cpSync(sourceClientDir, targetDir, { recursive: true })
}

async function buildBench({ slug, folder, command }) {
  const benchDir = path.join(rootDir, folder)
  const targetDir = path.join(outBenchesDir, slug)
  const basePath = `/benches/${slug}/`
  const basename = `/benches/${slug}`
  const clientOutDir = command === "react-router" ? "build/client" : "dist"
  const sourceClientDir = path.join(benchDir, clientOutDir)
  const serverDir = command === "react-router" ? path.join(benchDir, "build", "server") : undefined
  const hash = sourceHash(benchDir, [overlayPath, adaptPath], [command, basePath])

  console.log(`\n==> [${slug}] Building (${command})...`)
  if (!existsSync(benchDir)) {
    throw new Error(`[${slug}] directory ${benchDir} does not exist`)
  }
  if (!existsSync(path.join(benchDir, "node_modules"))) {
    throw new Error(`[${slug}] node_modules missing — run overview/install-all.mjs`)
  }

  if (restoreBenchArtifacts(rootDir, slug, hash, { clientDir: sourceClientDir, serverDir })) {
    console.log(`==> [${slug}] build cache hit`)
    if (command === "react-router" && !existsSync(path.join(serverDir, "index.js"))) {
      throw new Error(`[${slug}] cached SSR build missing ${path.join(serverDir, "index.js")}`)
    }
    copyClient(sourceClientDir, targetDir)
    return command === "react-router" ? { slug, folder } : null
  }

  const env = { LYRICSBENCH_DIR: benchDir, LYRICSBENCH_BASE: basePath }
  await withLocalViteConfig(benchDir, basePath, async (configFile) => {
    if (command === "react-router") {
      await withPatchedReactRouterConfig(benchDir, basename, () =>
        run(benchDir, "react-router", ["build", "--config", configFile], env),
      )
    } else {
      await run(benchDir, "vite", ["build", "--config", configFile], env)
    }
  })

  if (command === "react-router" && !existsSync(path.join(serverDir, "index.js"))) {
    throw new Error(`[${slug}] missing ${path.join(serverDir, "index.js")}`)
  }

  copyClient(sourceClientDir, targetDir)
  saveBenchArtifacts(rootDir, slug, hash, { clientDir: sourceClientDir, serverDir })
  return command === "react-router" ? { slug, folder } : null
}

console.log("==> Building overview board...")
await run(overviewDir, "tsc", ["--noEmit"])
await run(overviewDir, "vite", ["build"])

const benches = loadBenches()
if (benches.length === 0) throw new Error("no benches in src/benches.ts")
const jobs = jobCount()
console.log(`==> Found ${benches.length} benchmarks in benches.ts (${jobs} jobs)`)

mkdirSync(outBenchesDir, { recursive: true })
const results = await mapPool(benches, jobs, buildBench)
const ssrBenches = results.filter(Boolean)

writeSsrMap(ssrBenches)
console.log(`\n==> Wrote ${ssrBenches.length} SSR loader(s) to overview/api/ssr-map.js`)
console.log("==> All benchmarks built into overview/dist/benches")
