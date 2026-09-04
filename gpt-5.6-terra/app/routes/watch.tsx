import { redirect } from "react-router"
import { isYouTubeId } from "~/lib/media"

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url)
  const videoId = url.searchParams.get("v") ?? ""
  if (!isYouTubeId(videoId)) throw new Response("Not found", { status: 404 })
  return redirect(`/play/${videoId}`)
}

export default function WatchRedirect() {
  return null
}
