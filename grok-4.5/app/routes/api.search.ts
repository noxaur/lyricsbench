import type { LoaderFunctionArgs } from "react-router"
import { YouTube } from "youtube-sr"
import type { SongSearchHit } from "~/lib/types"

function parseDuration(video: { duration: number; durationFormatted?: string }): number | null {
  const formatted = video.durationFormatted?.trim()
  if (formatted && formatted !== "0:00") {
    const parts = formatted.split(":").map(Number)
    if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1]
    if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (!video.duration || video.duration <= 0) return null
  return video.duration > 10_000 ? Math.round(video.duration / 1000) : Math.round(video.duration)
}

function rank(hits: SongSearchHit[], query: string): SongSearchHit[] {
  const q = query.toLowerCase()
  const scored = hits.map((hit) => {
    let score = 0
    const title = hit.title.toLowerCase()
    const channel = hit.channel.toLowerCase()
    if (/- topic$/i.test(hit.channel)) score -= 40
    if (/official audio|official video|provided to youtube/i.test(hit.title)) score -= 20
    if (/\blive\b|\bcover\b|\bhour\b|\bmix\b|\bkaraoke\b/i.test(hit.title) && !/\blive\b|\bcover\b/.test(q)) {
      score += 25
    }
    if (title.includes(q) || q.split(/\s+/).every((part) => title.includes(part))) score -= 8
    if (channel.includes("vevo")) score -= 6
    if (hit.durationSec && hit.durationSec > 900) score += 30
    if (hit.durationSec && hit.durationSec < 45) score += 20
    return { hit, score }
  })
  scored.sort((a, b) => a.score - b.score)
  const seen = new Set<string>()
  return scored
    .map((row) => row.hit)
    .filter((hit) => {
      if (seen.has(hit.videoId)) return false
      seen.add(hit.videoId)
      return true
    })
}

export async function loader({ request }: LoaderFunctionArgs) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return Response.json({ hits: [] satisfies SongSearchHit[] })

  try {
    const videos = await YouTube.search(q, { limit: 12, type: "video" })
    const hits: SongSearchHit[] = videos
      .filter((video) => video.id && !video.live)
      .map((video) => ({
        videoId: video.id!,
        title: video.title ?? video.id!,
        channel: video.channel?.name ?? "",
        durationSec: parseDuration(video),
        thumbnail: `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      }))
    return Response.json({ hits: rank(hits, q).slice(0, 8) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed"
    return Response.json({ hits: [], error: message }, { status: 502 })
  }
}
