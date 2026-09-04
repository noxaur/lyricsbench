import type { LoaderFunctionArgs } from "react-router"
import { parseTrackTitleCandidates } from "~/lib/titles"
import { resolveLyrics } from "~/lib/lyrics-resolve"

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const artist = url.searchParams.get("artist")?.trim() ?? ""
  const track = url.searchParams.get("track")?.trim() ?? ""
  const title = url.searchParams.get("title")?.trim() ?? ""
  const durationSec = Number(url.searchParams.get("duration") ?? 0)
  const extra = title ? parseTrackTitleCandidates(title, artist) : []

  const result = await resolveLyrics({
    artist,
    track,
    durationSec: Number.isFinite(durationSec) ? durationSec : 0,
    extraCandidates: extra,
  })

  return Response.json(result)
}
