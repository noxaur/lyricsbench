import { spawn, type ChildProcess } from "node:child_process"
import { createServer } from "node:net"
import path from "node:path"
import type { Plugin } from "vite"
import { benches, type Bench, type BenchCommand } from "./src/benches"

type Running = {
  url: string
  child: ChildProcess
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address()
      if (!addr || typeof addr === "string") {
        server.close()
        reject(new Error("could not allocate a port"))
        return
      }
      const port = addr.port
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
    server.on("error", reject)
  })
}

function bin(command: BenchCommand): string[] {
  if (command === "react-router") {
    return ["react-router", "dev"]
  }
  return ["vite"]
}

async function waitUntilUp(url: string, child: ChildProcess, logs: string[]): Promise<void> {
  const deadline = Date.now() + 90_000
  let exitCode: number | null = null
  child.once("exit", (code) => {
    exitCode = code
  })

  while (Date.now() < deadline) {
    if (exitCode !== null) {
      throw new Error(
        `dev server exited (${exitCode})${logs.length ? `\n${logs.slice(-20).join("")}` : ""}`,
      )
    }
    try {
      await fetch(url, { signal: AbortSignal.timeout(800) })
      return
    } catch {
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  throw new Error("timed out waiting for the bench to come up")
}

async function startBench(workspace: string, bench: Bench): Promise<Running> {
  const port = await freePort()
  const cwd = path.join(workspace, bench.folder)
  const args = [
    ...bin(bench.command),
    "--port",
    String(port),
    "--strictPort",
    "--host",
    "127.0.0.1",
  ]
  const logs: string[] = []
  const child = spawn("npx", args, {
    cwd,
    env: { ...process.env, BROWSER: "none" },
    stdio: ["ignore", "pipe", "pipe"],
  })

  const collect = (buf: Buffer) => {
    logs.push(buf.toString())
    if (logs.length > 80) logs.splice(0, logs.length - 80)
  }
  child.stdout?.on("data", collect)
  child.stderr?.on("data", collect)

  const url = `http://127.0.0.1:${port}`
  try {
    await waitUntilUp(url, child, logs)
  } catch (err) {
    child.kill("SIGTERM")
    throw err
  }
  return { url, child }
}

export function benchesPlugin(): Plugin {
  const workspace = path.resolve(import.meta.dirname, "..")
  const running = new Map<string, Running>()
  const inflight = new Map<string, Promise<string>>()

  function killAll() {
    for (const r of running.values()) {
      r.child.kill("SIGTERM")
    }
    running.clear()
  }

  async function urlFor(slug: string): Promise<string> {
    const existing = running.get(slug)
    if (existing) return existing.url

    const pending = inflight.get(slug)
    if (pending) return pending

    const bench = benches.find((b) => b.slug === slug)
    if (!bench) throw new Error("unknown bench")

    const task = startBench(workspace, bench)
      .then((started) => {
        running.set(slug, started)
        started.child.once("exit", () => {
          running.delete(slug)
        })
        return started.url
      })
      .finally(() => inflight.delete(slug))

    inflight.set(slug, task)
    return task
  }

  return {
    name: "lyricsbench-benches",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0] ?? ""
        const match = pathname.match(/^\/__bench\/([^/]+)$/)
        if (req.method !== "GET" || !match) {
          next()
          return
        }

        const slug = decodeURIComponent(match[1])
        if (!benches.some((b) => b.slug === slug)) {
          res.statusCode = 404
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ error: "unknown bench" }))
          return
        }

        try {
          const url = await urlFor(slug)
          res.setHeader("Content-Type", "application/json")
          res.end(JSON.stringify({ url }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader("Content-Type", "application/json")
          res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : "could not start bench",
            }),
          )
        }
      })

      server.httpServer?.once("close", killAll)
      process.once("exit", killAll)
    },
  }
}
