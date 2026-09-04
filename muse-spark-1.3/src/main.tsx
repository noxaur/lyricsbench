import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Root } from "./root";
import { Home, homeAction } from "./routes/home";
import { Play, playLoader } from "./routes/play";
import { NotFound } from "./routes/not-found";
import "./styles.css";

/**
 * Fresh React Router setup.
 *
 * Novel vs the previous generation's <Routes>/<Route> tree with
 * component-level branching (MisroutedRouteView, PLAY_ROUTE_ALIASES,
 * analyzeRoute + levenshtein suggestions): route validity is decided in
 * LOADERS, before any player code mounts. An invalid /play/:videoId never
 * creates a YouTube player or fires a lyrics request — the loader throws
 * a 404 Response and the error boundary renders NotFound.
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home />, action: homeAction },
      {
        path: "play/:videoId",
        element: <Play />,
        loader: playLoader,
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const el = document.getElementById("root");
if (!el) throw new Error("missing #root element");
createRoot(el).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
