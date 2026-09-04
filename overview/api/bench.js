import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequestHandler } from "react-router-8"
import { publicBenchUrl } from "../bench-adapt.mjs"
import { loadSsr } from "./ssr-map.js"

const handlers = new Map()
const distBenches = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist/benches")

function isSlug(value) {
  return /^[a-z0-9][a-z0-9.-]{0,63}$/i.test(value)
}

function isFetchRequest(req) {
  return typeof Request !== "undefined" && req instanceof Request
}

function nodeToFetch(req) {
  const host = req.headers.host || "localhost"
  const proto = req.headers["x-forwarded-proto"] || "https"
  const url = `${proto}://${host}${req.url}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue
    headers.set(key, Array.isArray(value) ? value.join(",") : value)
  }
  const method = req.method || "GET"
  const init = { method, headers }
  if (method !== "GET" && method !== "HEAD") {
    init.body = req
    init.duplex = "half"
  }
  return new Request(url, init)
}

async function sendNode(res, response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  res.end(Buffer.from(await response.arrayBuffer()))
}

function spaIndex(slug) {
  const indexPath = path.join(distBenches, slug, "index.html")
  if (!existsSync(indexPath)) return null
  return new Response(readFileSync(indexPath), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

async function handleFetch(req) {
  const incoming = new URL(req.url)
  const slug = incoming.searchParams.get("slug")
  if (!slug || !isSlug(slug)) {
    return Response.json({ error: "Missing benchmark slug" }, { status: 400 })
  }

  const rest = incoming.searchParams.get("path") ?? ""
  const load = loadSsr[slug]
  if (!load) {
    return spaIndex(slug) ?? fetch(new URL(`/benches/${slug}/index.html`, req.url))
  }

  let handle = handlers.get(slug)
  if (!handle) {
    const build = await load()
    handle = createRequestHandler(build, "production")
    handlers.set(slug, handle)
  }

  const url = publicBenchUrl(req.url, slug, rest)
  const init = { method: req.method, headers: req.headers }
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body
    init.duplex = "half"
  }
  return handle(new Request(url, init))
}

export default async function handler(req, res) {
  const request = isFetchRequest(req) ? req : nodeToFetch(req)
  const response = await handleFetch(request)
  if (res && typeof res.end === "function") {
    await sendNode(res, response)
    return
  }
  return response
}

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
}
