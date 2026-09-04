import type { ActionFunctionArgs } from "react-router"

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json({ lines: [] }, { status: 405 })
  }
  const body = (await request.json()) as { lines?: string[]; sourceLang?: string }
  const lines = Array.isArray(body.lines) ? body.lines : []
  const sourceLang = body.sourceLang && body.sourceLang !== "en" ? body.sourceLang : "autodetect"
  if (lines.length === 0) return Response.json({ lines: [] })

  const translated: string[] = []
  for (const line of lines) {
    if (!line.trim()) {
      translated.push("")
      continue
    }
    const q = new URLSearchParams({
      q: line.slice(0, 450),
      langpair: `${sourceLang}|en`,
    })
    const res = await fetch(`https://api.mymemory.translated.net/get?${q}`)
    if (!res.ok) {
      translated.push(line)
      continue
    }
    const data = (await res.json()) as { responseData?: { translatedText?: string } }
    translated.push(data.responseData?.translatedText?.trim() || line)
  }
  return Response.json({ lines: translated })
}
