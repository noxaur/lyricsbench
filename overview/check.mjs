import { existsSync, readdirSync, readFileSync } from "node:fs"
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

for (const entry of readdirSync(workspace, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name === "overview") continue
  if (!existsSync(path.join(workspace, entry.name, "package.json"))) continue
  if (!benches.some((bench) => bench.folder === entry.name)) {
    failures.push(`${entry.name}: booth folder is not registered in src/benches.ts`)
  }
}

if (failures.length) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log(`ok ${benches.length} react-router benches`)
