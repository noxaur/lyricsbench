import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { extractVideoId } from "@/lib/youtube"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function UrlInput() {
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = extractVideoId(value)
    if (!id) {
      setError("Paste a valid YouTube link or 11-char video ID")
      return
    }
    navigate(`/play/${id}`, { state: { fromHome: true } })
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl" noValidate>
      <label htmlFor="yt-url" className="mb-1.5 block text-sm font-medium text-foreground">
        YouTube link
      </label>
      <div className="flex gap-2">
        <Input
          id="yt-url"
          placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null) }}
          aria-invalid={!!error}
          aria-describedby={error ? "url-error" : undefined}
          className="flex-1"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" className="shrink-0">Play</Button>
      </div>
      {error ? (
        <p id="url-error" role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Supports youtube.com, youtu.be, music.youtube.com, and bare IDs.</p>
      )}
    </form>
  )
}
