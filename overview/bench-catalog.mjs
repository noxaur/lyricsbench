import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const overviewDir = path.dirname(fileURLToPath(import.meta.url))

export function overviewDirFrom(metaUrl = import.meta.url) {
  return path.dirname(fileURLToPath(metaUrl))
}

export function loadBenches(src = readFileSync(path.join(overviewDir, "src/benches.ts"), "utf8")) {
  const benches = []
  for (const block of src.matchAll(/\{\s*slug:\s*"([^"]+)"[\s\S]*?command:\s*"([^"]+)"/g)) {
    const chunk = block[0]
    const slug = /slug:\s*"([^"]+)"/.exec(chunk)?.[1]
    const folder = /folder:\s*"([^"]+)"/.exec(chunk)?.[1]
    const command = /command:\s*"([^"]+)"/.exec(chunk)?.[1]
    if (slug && folder && command) benches.push({ slug, folder, command })
  }
  return benches
}
