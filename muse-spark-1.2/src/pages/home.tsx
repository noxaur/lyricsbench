import { Link } from "react-router-dom"
import { AppShell } from "@/components/app-shell"
import { UrlInput } from "@/components/url-input"
import { getRecent, clearRecent } from "@/lib/recent"
import { thumbnailUrl } from "@/lib/youtube"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function HomePage() {
  const [recent, setRecent] = useState(() => getRecent())

  return (
    <AppShell>
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">umbra</h1>
          <p className="mt-3 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">
            Paste a YouTube link to sing along with synced lyrics. Minimal chrome, maximum sing.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Space to play/pause · ←/→ to seek · +/- to adjust sync · F for TV mode
          </p>
        </div>

        <UrlInput />

        <div className="flex w-full max-w-xl items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" aria-hidden />
          <span>fresh • novel • karaoke-first</span>
          <span className="h-px flex-1 bg-border" aria-hidden />
        </div>

        <div className="w-full max-w-xl rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-semibold">What’s new vs legacy umbra</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li><strong className="text-foreground">Per-track sync offset</strong> – no more global offset leak (S3)</li>
            <li><strong className="text-foreground">Capped lyric holds</strong> – 8s max, gaps show <em>♪ Instrumental ♪</em> (S1)</li>
            <li><strong className="text-foreground">True TV mode</strong> – one key, lyrics fill the room</li>
            <li><strong className="text-foreground">A11y live region</strong> + roving tabindex, inert video when hidden</li>
            <li><strong className="text-foreground">No Cloudflare gateway</strong> – direct LRCLIB, works offline after cache</li>
          </ul>
        </div>

        {recent.length > 0 && (
          <div className="w-full max-w-xl">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Recent</h2>
              <Button variant="ghost" size="sm" onClick={() => { clearRecent(); setRecent([]) }}>Clear</Button>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {recent.map((s) => (
                <li key={s.videoId}>
                  <Link
                    to={`/play/${s.videoId}`}
                    state={{ fromHome: true }}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <img src={thumbnailUrl(s.videoId)} alt="" width={68} height={38} loading="lazy" className="h-10 w-16 shrink-0 rounded-md border border-border object-cover" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{s.artist ? `${s.artist} — ${s.title || s.videoId}` : (s.title || s.videoId)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </AppShell>
  )
}
