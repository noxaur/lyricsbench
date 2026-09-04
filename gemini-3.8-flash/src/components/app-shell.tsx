import React, { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { Palette, ListMusic, Sparkles, Search, Disc3 } from "lucide-react"
import { ThemeSelectorModal } from "./theme-selector-modal"
import { SongSearch } from "./song-search"

type AppShellProps = {
  children: React.ReactNode
}

function GithubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function AppShell({ children }: AppShellProps) {
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-md px-4 py-2.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo / Brand */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 group transition-transform active:scale-95"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
                <Disc3 className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
              </div>
              <span className="font-bold tracking-tight text-lg text-foreground group-hover:text-primary transition-colors">
                umbra
              </span>
            </Link>

            {/* Quick search input on desktop if not on home page */}
            {location.pathname !== "/" && (
              <div className="hidden md:block w-72 lg:w-96">
                <SongSearch placeholder="Quick song search…" />
              </div>
            )}
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile search toggle */}
            {location.pathname !== "/" && (
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Search Songs"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            <Link
              to="/playlists"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                location.pathname.startsWith("/playlists")
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <ListMusic className="w-4 h-4" />
              <span className="hidden sm:inline">Playlists</span>
            </Link>

            <Link
              to="/themes"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                location.pathname.startsWith("/themes")
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Themes</span>
            </Link>

            <Link
              to="/changelog"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                location.pathname === "/changelog"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span className="hidden sm:inline">Changelog</span>
            </Link>

            {/* Theme switcher modal trigger */}
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
              title="Switch Theme"
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* GitHub Repo */}
            <a
              href="https://github.com/noxaur/umbra-lyrics"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="GitHub Repository"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Theme Selector Modal */}
      <ThemeSelectorModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />

      {/* Mobile Search Overlay Modal */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 p-4 bg-black/60 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between pb-3">
            <h3 className="font-semibold text-white">Search Song</h3>
            <button
              type="button"
              onClick={() => setSearchModalOpen(false)}
              className="text-white/80 hover:text-white px-2 py-1 text-sm"
            >
              Close
            </button>
          </div>
          <SongSearch
            autoFocus
            onSelect={() => setSearchModalOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
