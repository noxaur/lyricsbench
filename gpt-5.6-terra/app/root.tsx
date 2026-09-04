import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router"
import type { ReactNode } from "react"
import { AppShell } from "~/components/app-shell"
import "./app.css"

const themeBoot = `(function(){try{var saved=localStorage.getItem("umbra.theme.v3");if(saved==="dawn"||saved==="night")document.documentElement.dataset.theme=saved;}catch(_){}})()`

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="night">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#090d18" />
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
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const status = isRouteErrorResponse(error) ? error.status : 500
  const title = status === 404 ? "That room doesn’t exist" : "The stage went quiet"
  const message =
    status === 404
      ? "Check the link, or start with a YouTube video from home."
      : "Refresh the page or choose another track. Your recent songs are still here."

  return (
    <main className="route-error">
      <p className="route-error__signal">umbra / off air</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <Link className="button button--primary" to="/">Return home</Link>
    </main>
  )
}
