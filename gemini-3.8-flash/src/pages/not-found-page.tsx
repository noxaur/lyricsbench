import React from "react"
import { Link } from "react-router-dom"
import { Home, Disc3 } from "lucide-react"

export function NotFoundPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-card border border-border/70 flex items-center justify-center text-primary mb-4 shadow-sm">
        <Disc3 className="w-8 h-8 opacity-60" />
      </div>
      <h1 className="text-3xl font-extrabold text-foreground mb-2">404</h1>
      <p className="text-sm text-muted-foreground mb-6">Page not found on stage.</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:opacity-90 transition-all shadow-sm"
      >
        <Home className="w-4 h-4" />
        Return Home
      </Link>
    </div>
  )
}
