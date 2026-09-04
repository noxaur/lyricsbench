import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const overview = path.dirname(fileURLToPath(import.meta.url))
const workspace = path.resolve(overview, "..")
const src = readFileSync(path.join(overview, "src/benches.ts"), "utf8")
const folders = [...src.matchAll(/folder: "([^"]+)"/g)].map((m) => m[1])
const failures = []

if (folders.length === 0) failures.push("no folders listed in src/benches.ts")

for (const folder of folders) {
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

console.log(`ok ${folders.length} react-router benches`)
