import { redirect, type LoaderFunctionArgs } from "react-router"
import { extractYouTubeVideoId } from "~/lib/urls"

export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const id = extractYouTubeVideoId(url.search) || url.searchParams.get("v")
  if (id) return redirect(`/play/${id}`)
  return redirect("/")
}
