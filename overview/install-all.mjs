import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadBenches } from "./bench-catalog.mjs"
import { jobCount, mapPool, pmEnv, runCommand, shouldSkipInstall, writeStamp } from "./build-cache.mjs"

const overviewDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(overviewDir, "..")
const env = pmEnv(rootDir)

async function installDir(dir, label) {
  if (!existsSync(path.join(dir, "package.json"))) {
    throw new Error(`${label}: missing package.json`)
  }
  if (shouldSkipInstall(dir)) {
    console.log(`==> [${label}] node_modules cache hit, skipping install`)
    return
  }
  console.log(`==> [${label}] installing`)
  if (existsSync(path.join(dir, "pnpm-lock.yaml"))) {
    await runCommand("pnpm", ["install", "--frozen-lockfile", "--store-dir", env.PNPM_STORE_DIR], dir, env)
    writeStamp(dir)
    return
  }
  if (existsSync(path.join(dir, "package-lock.json"))) {
    const hasMods = existsSync(path.join(dir, "node_modules"))
    try {
      if (hasMods) {
        // Reuse Vercel's restored node_modules instead of `npm ci`, which deletes it.
        await runCommand("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund"], dir, env)
      } else {
        await runCommand("npm", ["ci", "--prefer-offline", "--no-audit", "--no-fund"], dir, env)
      }
    } catch {
      // ponytail: several booth lockfiles are stale vs package.json, so npm ci
      // dies on Vercel. Upgrade: regenerate each package-lock.json.
      console.warn(`[${label}] npm ci failed; falling back to npm install`)
      await runCommand("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund"], dir, env)
    }
    writeStamp(dir)
    return
  }
  await runCommand("npm", ["install", "--prefer-offline", "--no-audit", "--no-fund"], dir, env)
  writeStamp(dir)
}

const benches = loadBenches()
if (benches.length === 0) throw new Error("no benches in src/benches.ts")

const jobs = jobCount()
console.log(`==> install jobs: ${jobs}`)
await installDir(rootDir, "lyricsbench")
await mapPool(
  [{ dir: overviewDir, label: "overview" }, ...benches.map((bench) => ({ dir: path.join(rootDir, bench.folder), label: bench.slug }))],
  jobs,
  ({ dir, label }) => installDir(dir, label),
)

console.log(`==> installed overview + ${benches.length} benches`)
