import { Routes, Route } from "react-router-dom"
import { HomePage } from "@/pages/home"
import { PlayerPage } from "@/pages/player"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/play/:videoId" element={<PlayerPage />} />
      <Route path="/watch" element={<WatchRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function WatchRedirect() {
  const params = new URLSearchParams(window.location.search)
  const v = params.get("v")
  if (v && /^[\w-]{11}$/.test(v)) {
    window.location.replace(`/play/${v}`)
    return null
  }
  return <NotFound />
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-sm text-muted-foreground">Check the URL or go home.</p>
      <a href="/" className="text-sm underline">Home</a>
    </div>
  )
}
