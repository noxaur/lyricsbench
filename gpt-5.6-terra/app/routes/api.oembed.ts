import type { LoaderFunctionArgs } from "react-router"
import { isYouTubeId } from "~/lib/media"

export async function loader({ request }: LoaderFunctionArgs) {
  const videoId = new URL(request.url).searchParams.get("videoId")?.trim() ?? ""
  if (!isYouTubeId(videoId)) return Response.json({ error: "Invalid video id" }, { status: 400 })

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`, {
      headers: { Accept: "application/json" },
    })
    if (!response.ok) return Response.json({ error: "Video metadata was not available" }, { status: 404 })
    const body = (await response.json()) as { title?: string; author_name?: string }
    return Response.json({ title: body.title?.slice(0, 300) ?? "", author: body.author_name?.slice(0, 200) ?? "" })
  } catch {
    return Response.json({ error: "Video metadata lookup failed" }, { status: 502 })
  }
}
