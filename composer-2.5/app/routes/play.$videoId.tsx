import type { Route } from "./+types/play.$videoId"
import { Link } from "react-router"
import { Player, isPlayableId } from "~/components/player"

export function meta({ params }: Route.MetaArgs) {
  return [{ title: `umbra · ${params.videoId}` }]
}

export default function PlayPage({ params }: Route.ComponentProps) {
  if (!isPlayableId(params.videoId)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-lyric text-3xl">That is not a YouTube id</h1>
        <p className="text-dim">Paste a full watch URL on the home page.</p>
        <Link to="/" className="text-ember hover:underline">
          Home
        </Link>
      </main>
    )
  }
  return <Player videoId={params.videoId} />
}
