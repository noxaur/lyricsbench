import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "./components/theme-provider"
import { AppShell } from "./components/app-shell"

import { HomePage } from "./pages/home-page"
import { PlayerPage } from "./pages/player-page"
import { PlaylistsPage } from "./pages/playlists-page"
import { PlaylistDetailPage } from "./pages/playlist-detail-page"
import { ThemesPage } from "./pages/themes-page"
import { ThemeBuilderPage } from "./pages/theme-builder-page"
import { ChangelogPage } from "./pages/changelog-page"
import { WatchRedirectPage } from "./pages/watch-redirect-page"
import { NotFoundPage } from "./pages/not-found-page"

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/play/:videoId" element={<PlayerPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlists/:playlistId" element={<PlaylistDetailPage />} />
            <Route path="/themes" element={<ThemesPage />} />
            <Route path="/themes/build" element={<ThemeBuilderPage />} />
            <Route path="/changelog" element={<ChangelogPage />} />
            <Route path="/watch" element={<WatchRedirectPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  )
}
