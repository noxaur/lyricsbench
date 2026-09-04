const BASE_EXPR = `import.meta.env.BASE_URL.replace(/\\/$/, "") || "/"`

export function injectBasename(code) {
  let next = code
  if (next.includes("__lb_cbr") || next.includes("lyricsbench-basename")) return next

  next = next.replace(
    /import\s*\{([\s\S]*?)\}\s*from\s*(["'])(react-router(?:-dom)?)\2/g,
    (full, names, quote, spec) => {
      if (!/\bcreateBrowserRouter\b/.test(names) || /\bcreateBrowserRouter\s+as\b/.test(names)) {
        return full
      }
      const renamed = names.replace(/\bcreateBrowserRouter\b/, "createBrowserRouter as __lb_cbr")
      return `import {${renamed}} from ${quote}${spec}${quote};\nconst createBrowserRouter = (routes, opts) => __lb_cbr(routes, { ...opts, basename: ${BASE_EXPR} });`
    },
  )

  next = next.replace(/<BrowserRouter>/g, `<BrowserRouter basename={import.meta.env.BASE_URL}>`)
  next = next.replace(
    /<BrowserRouter(\s+)(?![^>]*\bbasename=)/g,
    `<BrowserRouter basename={import.meta.env.BASE_URL}$1`,
  )
  return next
}

export function prefixApiFetches(code) {
  return code.replace(
    /\bfetch\(\s*(["'`])(\/api\/)/g,
    `fetch(import.meta.env.BASE_URL.replace(/\\/$/, "") + $1$2`,
  )
}

export function adaptSource(code, id) {
  const file = id.split("?")[0]
  if (file.includes("node_modules") || !/\.[cm]?[jt]sx?$/.test(file)) return null
  const next = prefixApiFetches(injectBasename(code))
  return next === code ? null : next
}

export function basenamePlugin() {
  return {
    name: "lyricsbench-basename",
    enforce: "pre",
    transform(code, id) {
      return adaptSource(code, id)
    },
  }
}

export function publicBenchUrl(requestUrl, slug, rest) {
  const url = new URL(requestUrl)
  const suffix = (rest ?? "").replace(/^\/+/, "")
  url.pathname = suffix ? `/benches/${slug}/${suffix}` : `/benches/${slug}/`
  url.searchParams.delete("slug")
  url.searchParams.delete("path")
  return url
}

export function patchReactRouterConfig(src, basename) {
  if (/basename\s*:/.test(src)) {
    return src.replace(/basename\s*:\s*(["'][^"']*["']|`[^`]*`)/, `basename: ${JSON.stringify(basename)}`)
  }
  if (!/export default \{/.test(src)) {
    throw new Error("react-router.config.ts has no `export default {` to patch")
  }
  return src.replace(
    /export default \{/,
    `export default {\n  basename: ${JSON.stringify(basename)},\n  routeDiscovery: { mode: "initial" },`,
  )
}
