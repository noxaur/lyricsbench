import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"

const STAMP = ".lyricsbench-stamp"
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  ".agents",
  ".cache",
  ".vercel",
  ".vite",
  ".react-router",
  ".wrangler",
  ".fly",
  ".worktrees",
])
const SKIP_FILES = new Set(["vite.config.lyricsbench.mjs", ".DS_Store"])
const MANIFEST_FILES = ["package.json", "package-lock.json", "pnpm-lock.yaml", ".npmrc", "pnpm-workspace.yaml"]

export function cacheDisabled() {
  return process.env.LYRICSBENCH_NO_CACHE === "1"
}

export function jobCount() {
  const raw = process.env.LYRICSBENCH_BUILD_JOBS
  if (raw) {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 1) return Math.min(16, Math.floor(n))
  }
  const cpus = typeof os.availableParallelism === "function" ? os.availableParallelism() : (os.cpus()?.length ?? 2)
  // ponytail: 4 concurrent Vite/RR builds can OOM on smaller Vercel machines. LYRICSBENCH_BUILD_JOBS raises the cap.
  return Math.min(4, Math.max(1, cpus))
}

export async function mapPool(items, concurrency, fn) {
  if (items.length === 0) return []
  const n = Math.min(Math.max(1, concurrency), items.length)
  let i = 0
  const out = new Array(items.length)
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx], idx)
      }
    }),
  )
  return out
}

export function cacheHome(rootDir) {
  return path.join(rootDir, "node_modules", ".cache")
}

export function ensurePmCache(rootDir) {
  const home = cacheHome(rootDir)
  const npm = path.join(home, "npm")
  const pnpm = path.join(home, "pnpm")
  mkdirSync(npm, { recursive: true })
  mkdirSync(pnpm, { recursive: true })
  mkdirSync(path.join(home, "lyricsbench"), { recursive: true })
  return { npm, pnpm, benches: path.join(home, "lyricsbench") }
}

export function pmEnv(rootDir) {
  const { npm, pnpm } = ensurePmCache(rootDir)
  return {
    ...process.env,
    npm_config_cache: npm,
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_update_notifier: "false",
    npm_config_progress: "false",
    npm_config_prefer_offline: "true",
    PNPM_STORE_DIR: pnpm,
  }
}

export function runCommand(command, args, cwd, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(" ")} exited ${code}`))
    })
  })
}

export function manifestHash(dir) {
  const hash = createHash("sha256")
  for (const name of MANIFEST_FILES) {
    const file = path.join(dir, name)
    if (!existsSync(file)) continue
    hash.update(name)
    hash.update(readFileSync(file))
  }
  return hash.digest("hex")
}

export function writeStamp(dir) {
  mkdirSync(path.join(dir, "node_modules"), { recursive: true })
  writeFileSync(path.join(dir, "node_modules", STAMP), manifestHash(dir))
}

export function stampMatches(dir) {
  const file = path.join(dir, "node_modules", STAMP)
  if (!existsSync(file)) return false
  return readFileSync(file, "utf8") === manifestHash(dir)
}

export function installReady(dir) {
  return existsSync(path.join(dir, "node_modules", ".bin")) && stampMatches(dir)
}

export function shouldSkipInstall(dir) {
  if (cacheDisabled()) return false
  if (!existsSync(path.join(dir, "node_modules"))) return false
  if (!process.env.VERCEL) return true
  return installReady(dir)
}

export function sourceHash(dir, extraFiles = [], extraParts = []) {
  const hash = createHash("sha256")
  walk(dir, "", hash)
  for (const file of extraFiles) {
    if (!existsSync(file)) continue
    hash.update(path.basename(file))
    hash.update(readFileSync(file))
  }
  for (const part of extraParts) hash.update(String(part))
  return hash.digest("hex")
}

function walk(dir, rel, hash) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || SKIP_FILES.has(entry.name) || entry.name.startsWith(".")) continue
    const nextRel = rel ? `${rel}/${entry.name}` : entry.name
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, nextRel, hash)
      continue
    }
    if (!entry.isFile()) continue
    hash.update(nextRel)
    hash.update(readFileSync(full))
  }
}

export function benchArtifactDir(rootDir, slug) {
  return path.join(cacheHome(rootDir), "lyricsbench", slug)
}

export function readCachedHash(rootDir, slug) {
  const file = path.join(benchArtifactDir(rootDir, slug), "hash")
  if (!existsSync(file)) return null
  return readFileSync(file, "utf8").trim()
}

export function saveBenchArtifacts(rootDir, slug, hash, { clientDir, serverDir }) {
  const dest = benchArtifactDir(rootDir, slug)
  rmSync(dest, { recursive: true, force: true })
  mkdirSync(path.join(dest, "client"), { recursive: true })
  cpSync(clientDir, path.join(dest, "client"), { recursive: true })
  if (serverDir && existsSync(serverDir)) {
    mkdirSync(path.join(dest, "server"), { recursive: true })
    cpSync(serverDir, path.join(dest, "server"), { recursive: true })
  }
  writeFileSync(path.join(dest, "hash"), hash)
}

export function restoreBenchArtifacts(rootDir, slug, hash, { clientDir, serverDir }) {
  if (cacheDisabled()) return false
  if (readCachedHash(rootDir, slug) !== hash) return false
  const src = benchArtifactDir(rootDir, slug)
  const clientSrc = path.join(src, "client")
  if (!existsSync(clientSrc)) return false
  if (serverDir) {
    const serverSrc = path.join(src, "server")
    if (!existsSync(serverSrc)) return false
    mkdirSync(serverDir, { recursive: true })
    cpSync(serverSrc, serverDir, { recursive: true })
  }
  mkdirSync(clientDir, { recursive: true })
  cpSync(clientSrc, clientDir, { recursive: true })
  return true
}
