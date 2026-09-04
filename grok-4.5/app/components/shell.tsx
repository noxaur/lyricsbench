import { NavLink, useLocation } from "react-router"
import { cn } from "~/lib/cn"

const links = [
  { to: "/playlists", label: "Playlists" },
  { to: "/themes", label: "Themes" },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const player = location.pathname.startsWith("/play/")

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-canvas text-ink">
      {!player && (
        <header className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
          <NavLink to="/" className="font-lyric text-xl tracking-tight">
            umbra
          </NavLink>
          <nav className="flex items-center gap-5 text-sm text-dim">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => cn("hover:text-ink", isActive && "text-ink")}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </header>
      )}
      <div className={cn("flex min-h-0 flex-1 flex-col", player ? "overflow-hidden" : "overflow-y-auto")}>
        {children}
      </div>
    </div>
  )
}
