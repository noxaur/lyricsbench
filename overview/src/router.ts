import { createBrowserRouter } from "react-router"

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: () => import("./pages/board"),
    HydrateFallback: () => null,
  },
  {
    path: "/b/:slug",
    lazy: () => import("./pages/stage"),
    HydrateFallback: () => null,
  },
])
