import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router"
import { Shell } from "~/components/shell"
import type { Route } from "./+types/root"
import "./app.css"

const themeBoot = `(function(){try{var t=localStorage.getItem("umbra-theme");if(t)document.documentElement.setAttribute("data-theme",JSON.parse(t));}catch(e){}})();`

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="velvet">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something broke"
  let details = "Reload and try another track."

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Not found" : `Error ${error.status}`
    details =
      error.status === 404
        ? "That page is not part of umbra."
        : error.statusText || details
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-lyric text-3xl">{message}</h1>
      <p className="max-w-md text-dim">{details}</p>
      <a href="/" className="text-ember underline-offset-4 hover:underline">
        Back home
      </a>
    </main>
  )
}
