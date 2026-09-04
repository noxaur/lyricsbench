import { Routes, Route, Link, Outlet } from "react-router";
import { Music } from "lucide-react";
import { initTheme } from "@/lib/themes";
import HomePage from "./routes/_index";
import PlayerPage from "./routes/player.$videoId";
import PlaylistsPage from "./routes/playlists._index";
import PlaylistDetailPage from "./routes/playlists.$playlistId";
import ThemesPage from "./routes/themes._index";

initTheme();

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-ink-primary hover:text-primary">
          <Music className="h-4 w-4 text-primary" />
          <span>umbra</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/" className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink-primary">Home</Link>
          <Link to="/playlists" className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink-primary">Playlists</Link>
          <Link to="/themes" className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-surface-muted hover:text-ink-primary">Themes</Link>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="play/:videoId" element={<PlayerPage />} />
        <Route path="playlists" element={<PlaylistsPage />} />
        <Route path="playlists/:playlistId" element={<PlaylistDetailPage />} />
        <Route path="themes" element={<ThemesPage />} />
      </Route>
    </Routes>
  );
}
