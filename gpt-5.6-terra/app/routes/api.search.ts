import type { LoaderFunctionArgs } from "react-router"
import { YouTube } from "youtube-sr"
import type { SearchHit } from "~/lib/types"

function durationSeconds(value: { duration?: number; durationFormatted?: string }) {
  const formatted = value.durationFormatted?.trim()
  if (formatted) {
    const pieces = formatted.split(":").map(Number)
    if (pieces.length >= 2 && pieces.length <= 3 && pieces.every(Number.isFinite)) {
      return pieces.reduce((seconds, piece) => seconds * 60 + piece, 0)
    }
  }
  const raw = value.duration ?? 0
  if (!Number.isFinite(raw) || raw <= 0) return null
  return raw > 10_000 ? Math.round(raw / 1000) : Math.round(raw)
}

function qualityScore(hit: SearchHit, query: string) {
  const title = hit.title.toLowerCase()
  const q = query.toLowerCase()
  let score = 0
  if (title.includes(q)) score += 12
  if (/official (music )?(video|audio)|audio track|visuali[sz]er/i.test(hit.title)) score += 7
  if (/\b(live|cover|reaction|slowed|nightcore|karaoke|mix)\b/i.test(hit.title) && !/\b(live|cover|karaoke)\b/i.test(q)) score -= 14
  if ((hit.durationSec ?? 0) > 15 * 60 || (hit.durationSec ?? 0) < 35) score -= 12
  return score
}

export async function loader({ request }: LoaderFunctionArgs) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 120)
  if (q.length < 2) return Response.json({ hits: [] satisfies SearchHit[] })
  try {
    const videos = await YouTube.search(q, { limit: 16, type: "video" })
    const hits: SearchHit[] = videos
      .filter((video) => video.id && !video.live)
      .map((video) => ({
        videoId: video.id!,
        title: video.title ?? video.id!,
        channel: video.channel?.name ?? "",
        durationSec: durationSeconds(video),
        thumbnail: `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
      }))
      .filter((hit, index, all) => all.findIndex((candidate) => candidate.videoId === hit.videoId) === index)
      .sort((left, right) => qualityScore(right, q) - qualityScore(left, q))
      .slice(0, 8)
    return Response.json({ hits }, { headers: { "Cache-Control": "public, max-age=30" } })
  } catch {
    return Response.json({ hits: [], error: "YouTube search did not answer" }, { status: 502 })
  }
}
