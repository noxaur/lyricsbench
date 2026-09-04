import { useEffect, useState, type ReactNode } from "react"
import { Link, useLocation } from "react-router"
import { MoonIcon, SunIcon } from "~/components/icons"

type Theme = "night" | "dawn"

function readTheme(): Theme {
  if (typeof window === "undefined") return "night"
  try {
    return localStorage.getItem("umbra.theme.v3") === "dawn" ? "dawn" : "night"
  } catch {
    return "night"
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const playerRoute = location.pathname.startsWith("/play/")
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "night" ? "#090d18" : "#f4f6fd",
    )
    try {
      localStorage.setItem("umbra.theme.v3", theme)
    } catch {
      // A private browsing session should not make the controls fail.
    }
  }, [theme])

  if (playerRoute) return <div className="player-shell">{children}</div>

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="wordmark" to="/" aria-label="Umbra home">
          <span className="wordmark__dot" aria-hidden />
          umbra
        </Link>
        <div className="site-header__right">
          <span className="site-header__hint">lyrics, in time</span>
          <button
            className="icon-button theme-button"
            type="button"
            onClick={() => setTheme((current) => (current === "night" ? "dawn" : "night"))}
            aria-label={theme === "night" ? "Use the light theme" : "Use the dark theme"}
            title={theme === "night" ? "Use the light theme" : "Use the dark theme"}
          >
            {theme === "night" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>
        </div>
      </header>
      <div className="app-shell__content">{children}</div>
    </div>
  )
}
