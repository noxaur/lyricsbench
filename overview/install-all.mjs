import { execFileSync, execSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadBenches } from "./bench-catalog.mjs"

const overviewDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(overviewDir, "..")

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: "inherit", env: process.env })
}

function installDir(dir, label) {
  if (!existsSync(path.join(dir, "package.json"))) {
    throw new Error(`${label}: missing package.json`)
  }
  const skipLocal = !process.env.VERCEL && existsSync(path.join(dir, "node_modules"))
  if (skipLocal) {
    console.log(`==> [${label}] node_modules present, skipping install`)
    return
  }
  console.log(`==> [${label}] installing`)
  if (existsSync(path.join(dir, "pnpm-lock.yaml"))) {
    run("pnpm", ["install", "--frozen-lockfile"], dir)
    return
  }
  if (existsSync(path.join(dir, "package-lock.json"))) {
    try {
      run("npm", ["ci"], dir)
    } catch {
      // ponytail: several booth lockfiles are stale vs package.json, so npm ci
      // dies on Vercel. Upgrade: regenerate each package-lock.json.
      console.warn(`[${label}] npm ci failed; falling back to npm install`)
      execSync("npm install", { cwd: dir, stdio: "inherit", env: process.env })
    }
    return
  }
  execSync("npm install", { cwd: dir, stdio: "inherit" })
}

const benches = loadBenches()
if (benches.length === 0) throw new Error("no benches in src/benches.ts")

installDir(rootDir, "lyricsbench")
installDir(overviewDir, "overview")
for (const bench of benches) {
  installDir(path.join(rootDir, bench.folder), bench.slug)
}

console.log(`==> installed overview + ${benches.length} benches`)
