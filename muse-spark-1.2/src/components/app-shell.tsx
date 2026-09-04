import { Link } from "react-router-dom"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return true
    return document.documentElement.classList.contains("dark")
  })

  useEffect(() => {
    const root = document.documentElement
    if (dark) root.classList.add("dark")
    else root.classList.remove("dark")
    try { localStorage.setItem("umbra-theme", dark ? "dark" : "light") } catch {}
  }, [dark])

  useEffect(() => {
    try {
      const saved = localStorage.getItem("umbra-theme")
      if (saved === "light") setDark(false)
      else if (saved === "dark") setDark(true)
      else if (window.matchMedia("(prefers-color-scheme: light)").matches) setDark(false)
    } catch {}
  }, [])

  return (
    <div className="min-h-dvh flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link to="/" className="text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm px-1">
          umbra
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/play/dQw4w9WgXcQ" className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline">
            Demo
          </Link>
          <Button variant="ghost" size="icon" aria-label={`Switch to ${dark ? "light" : "dark"} theme`} onClick={() => setDark((v) => !v)}>
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </header>
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <footer className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
        Lyrics via <a href="https://lrclib.net" target="_blank" rel="noreferrer" className="underline hover:text-foreground">LRCLIB</a> · Playback via YouTube
      </footer>
    </div>
  )
}
