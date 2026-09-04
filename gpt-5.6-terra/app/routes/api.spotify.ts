import type { LoaderFunctionArgs } from "react-router"
import { YouTube } from "youtube-sr"

function titleParts(value: string) {
  const clean = value.replace(/^spotify\s+embed:\s*/i, "").trim()
  const pieces = clean.split(/\s+[·•|–—-]\s+/).map((piece) => piece.trim()).filter(Boolean)
  if (pieces.length > 1) return { track: pieces[0], artist: pieces.slice(1).join(" ") }
  return { track: value.trim(), artist: "" }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const trackId = (new URL(request.url).searchParams.get("trackId") ?? "").trim()
  if (!/^[A-Za-z0-9]{22}$/.test(trackId)) return Response.json({ error: "That is not a Spotify track link" }, { status: 400 })

  try {
    const spotifyUrl = `https://open.spotify.com/track/${trackId}`
    const oembedResponse = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(spotifyUrl)}`)
    if (!oembedResponse.ok) throw new Error("Spotify did not identify this track")
    const oembed = (await oembedResponse.json()) as { title?: string; html?: string }
    const htmlTitle = oembed.html?.match(/title="([^"]+)"/i)?.[1]
    // The structured oEmbed title is the track title. The iframe title is a
    // presentational label prefixed with "Spotify Embed:" and is only a fallback.
    const parsed = titleParts(oembed.title || htmlTitle || "")
    if (!parsed.track) throw new Error("Spotify did not provide a track title")
    const videos = await YouTube.search([parsed.artist, parsed.track, "official audio"].filter(Boolean).join(" "), { limit: 8, type: "video" })
    const video = videos.find((item) => item.id && !item.live)
    if (!video?.id) throw new Error("No YouTube match appeared for this track")
    return Response.json({ videoId: video.id, title: parsed.track, artist: parsed.artist })
  } catch (reason) {
    return Response.json({ error: reason instanceof Error ? reason.message : "Spotify matching is unavailable" }, { status: 502 })
  }
}
