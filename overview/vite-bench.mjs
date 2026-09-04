import { existsSync } from "node:fs"
import path from "node:path"
import { basenamePlugin } from "./bench-adapt.mjs"

function benchDir() {
  const dir = process.env.LYRICSBENCH_DIR
  if (!dir) throw new Error("LYRICSBENCH_DIR is not set")
  return dir
}

function findConfig(dir) {
  for (const name of ["vite.config.ts", "vite.config.mjs", "vite.config.js", "vite.config.mts"]) {
    const p = path.join(dir, name)
    if (existsSync(p)) return p
  }
  return undefined
}

export default async function lyricsbenchVite(env) {
  const dir = benchDir()
  const base = process.env.LYRICSBENCH_BASE ?? "/"
  const { loadConfigFromFile, mergeConfig } = await import("vite")
  const configFile = findConfig(dir)
  const loaded = configFile ? await loadConfigFromFile(env, configFile, dir) : null
  return mergeConfig(loaded?.config ?? {}, {
    root: dir,
    base,
    plugins: [basenamePlugin()],
  })
}
