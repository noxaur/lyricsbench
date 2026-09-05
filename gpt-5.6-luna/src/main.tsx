import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider, useSearchParams } from "react-router-dom";
import { HomePage, LibraryPage, NotFoundPage, PlayerPage, RoomsPage } from "./pages";
import { ThemeProvider } from "./lib/theme";
import { slugFromInput } from "./lib/format";
import "./styles.css";

function WatchRedirect() {
  const [params] = useSearchParams();
  const raw = params.get("v") || "midnight-amethyst";
  return <Navigate to={`/play/${slugFromInput(raw)}`} replace />;
}

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/play/:videoId", element: <PlayerPage /> },
  { path: "/playlists", element: <LibraryPage /> },
  { path: "/themes", element: <RoomsPage /> },
  { path: "/watch", element: <WatchRedirect /> },
  { path: "*", element: <NotFoundPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
