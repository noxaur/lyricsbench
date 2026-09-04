import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { loadBenches } from "./bench-catalog.mjs"

const overview = path.dirname(fileURLToPath(import.meta.url))
const workspace = path.resolve(overview, "..")
const benches = loadBenches()
const failures = []

if (benches.length === 0) failures.push("no benches listed in src/benches.ts")

for (const { folder } of benches) {
  const pkgPath = path.join(workspace, folder, "package.json")
  if (!existsSync(pkgPath)) {
    failures.push(`${folder}: missing package.json`)
    continue
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
  const deps = pkg.dependencies ?? {}
  if (!("react-router" in deps) && !("react-router-dom" in deps)) {
    failures.push(`${folder}: no react-router dependency`)
  }
}

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log(`ok ${benches.length} react-router benches`)
