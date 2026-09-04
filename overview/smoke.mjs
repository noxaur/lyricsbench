import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const overview = path.dirname(fileURLToPath(import.meta.url))
if (!existsSync(path.join(overview, "dist/index.html"))) {
  console.error("dist/index.html missing — run pnpm build first")
  process.exit(1)
}

const port = 4173
const base = `http://127.0.0.1:${port}`
const child = spawn(
  "pnpm",
  ["exec", "vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: overview, stdio: ["ignore", "pipe", "pipe"] },
)

const logs = []
const collect = (buf) => {
  logs.push(buf.toString())
  if (logs.length > 40) logs.splice(0, logs.length - 40)
}
child.stdout?.on("data", collect)
child.stderr?.on("data", collect)

let exitCode = null
child.once("exit", (code) => {
  exitCode = code
})

async function waitUntilUp() {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (exitCode !== null) {
      throw new Error(`preview exited (${exitCode})${logs.length ? `\n${logs.join("")}` : ""}`)
    }
    try {
      await fetch(base, { signal: AbortSignal.timeout(800) })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  throw new Error("timed out waiting for preview")
}

try {
  await waitUntilUp()
  for (const p of ["/", "/b/grok-4.6"]) {
    const res = await fetch(base + p)
    const html = await res.text()
    if (!res.ok) throw new Error(`${p} → ${res.status}`)
    if (!html.includes('id="root"') || !html.includes("lyricsbench")) {
      throw new Error(`${p} did not look like the overview`)
    }
  }
  console.log("ok smoke")
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
} finally {
  child.kill("SIGKILL")
  process.exit(process.exitCode ?? 0)
}
