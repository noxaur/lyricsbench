export type BenchCommand = "vite" | "react-router"

export type Bench = {
  slug: string
  name: string
  folder: string
  router: string
  routes: string[]
  command: BenchCommand
}

export const benches: Bench[] = [
  {
    slug: "composer-2.5",
    name: "composer 2.5",
    folder: "composer-2.5",
    router: "react-router 8 framework",
    routes: [
      "/",
      "/play/:videoId",
      "/playlists",
      "/playlists/:id",
      "/themes",
      "/watch",
    ],
    command: "react-router",
  },
  {
    slug: "gemini-3.8-flash",
    name: "gemini 3.8 flash",
    folder: "gemini-3.8-flash",
    router: "react-router-dom 7",
    routes: [
      "/",
      "/play/:videoId",
      "/playlists",
      "/playlists/:id",
      "/themes",
      "/themes/build",
      "/changelog",
      "/watch",
    ],
    command: "vite",
  },
  {
    slug: "grok-4.5",
    name: "grok 4.5",
    folder: "grok-4.5",
    router: "react-router 8 framework",
    routes: [
      "/",
      "/play/:videoId",
      "/playlists",
      "/playlists/:id",
      "/themes",
      "/watch",
    ],
    command: "react-router",
  },
  {
    slug: "grok-4.6",
    name: "grok 4.6",
    folder: "grok-4.6",
    router: "react-router 8 framework",
    routes: [
      "/",
      "/play/:videoId",
      "/playlists",
      "/playlists/:id",
      "/themes",
      "/watch",
    ],
    command: "react-router",
  },
  {
    slug: "mimo-v2.5",
    name: "mimo v2.5",
    folder: "mimo-v2.5",
    router: "react-router 8",
    routes: ["/", "/play/:videoId", "/playlists", "/playlists/:id", "/themes"],
    command: "vite",
  },
  {
    slug: "muse-spark-1.2",
    name: "muse spark 1.2",
    folder: "muse-spark-1.2",
    router: "react-router-dom 7",
    routes: ["/", "/play/:videoId", "/watch"],
    command: "vite",
  },
  {
    slug: "muse-spark-1.3",
    name: "muse spark 1.3",
    folder: "muse-spark-1.3",
    router: "react-router 8",
    routes: ["/", "/play/:videoId"],
    command: "vite",
  },
]

const displayNames: Record<string, string> = {
  "composer-2.5": "Composer 2.5",
  "gemini-3.8-flash": "Gemini 3.8 Flash",
  "grok-4.5": "Grok 4.5",
  "grok-4.6": "Grok 4.6",
  "mimo-v2.5": "Mimo v2.5",
  "muse-spark-1.2": "Muse Spark 1.2",
  "muse-spark-1.3": "Muse Spark 1.3",
}

export function getBenchDisplayName(bench: Bench): string {
  return displayNames[bench.slug] ?? bench.name
}

export function benchBySlug(slug: string): Bench | undefined {
  return benches.find((b) => b.slug === slug)
}
