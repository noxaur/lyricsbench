import type { LoaderFunctionArgs } from "react-router"

export async function loader({ request }: LoaderFunctionArgs) {
  const videoId = new URL(request.url).searchParams.get("videoId")?.trim() ?? ""
  if (!/^[\w-]{11}$/.test(videoId)) {
    return Response.json({ title: "", author: "" }, { status: 400 })
  }

  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`
  const res = await fetch(url)
  if (!res.ok) return Response.json({ title: "", author: "" }, { status: 404 })
  const data = (await res.json()) as { title?: string; author_name?: string }
  return Response.json({
    title: data.title ?? "",
    author: data.author_name ?? "",
  })
}
