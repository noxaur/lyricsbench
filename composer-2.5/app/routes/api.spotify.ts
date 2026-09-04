import type { LoaderFunctionArgs } from "react-router"
import { YouTube } from "youtube-sr"
import { extractSpotifyTrackId } from "~/lib/urls"

function parseOembedTitle(title: string, html?: string): { artist: string; track: string } {
  const fromHtml = html?.match(/title="([^"]+)"/i)?.[1]
  const source = fromHtml || title
  const parts = source.split(/\s+[·•-]\s+/)
  if (parts.length >= 2) {
    return { track: parts[0].trim(), artist: parts.slice(1).join(" ").trim() }
  }
  return { track: source.trim(), artist: "" }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""
  const id = extractSpotifyTrackId(q)
  if (!id) return Response.json({ error: "Not a Spotify track link" }, { status: 400 })

  const spotifyUrl = `https://open.spotify.com/track/${id}`
  const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`)
  if (!oembedRes.ok) return Response.json({ error: "Spotify lookup failed" }, { status: 502 })
  const oembed = (await oembedRes.json()) as { title?: string; html?: string }
  const parsed = parseOembedTitle(oembed.title ?? "", oembed.html)
  const query = [parsed.artist, parsed.track, "official audio"].filter(Boolean).join(" ")

  try {
    const videos = await YouTube.search(query, { limit: 8, type: "video" })
    const video = videos.find((item) => item.id && !item.live)
    if (!video?.id) return Response.json({ error: "Couldn't find this song on YouTube" }, { status: 404 })
    return Response.json({
      videoId: video.id,
      artist: parsed.artist,
      track: parsed.track,
    })
  } catch {
    return Response.json({ error: "YouTube search failed" }, { status: 502 })
  }
}
