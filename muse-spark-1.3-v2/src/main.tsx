import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Root } from "./root";
import { Home, homeAction } from "./routes/home";
import { Play, playLoader } from "./routes/play";
import { Watch, watchLoader } from "./routes/watch";
import { NotFound } from "./routes/not-found";
import "./styles.css";

/**
 * Fresh React Router setup (v2).
 *
 * Novel vs v1 (which already used loaders for /play validation): the /watch
 * compatibility route is ALSO a loader redirect — a pasted youtube.com/watch
 * URL never mounts a component, never creates a player, never fires lyrics.
 * Invalid IDs throw 404 Responses from loaders so the error boundary owns
 * every bad-URL state, including timestamped ?t= links preserved into /play.
 */
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home />, action: homeAction },
      { path: "play/:videoId", element: <Play />, loader: playLoader },
      { path: "watch", element: <Watch />, loader: watchLoader },
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
