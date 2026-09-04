import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { benches, getBenchDisplayName, type Bench } from "../benches"
import { getLabForSlug, ProviderLogo } from "../labs"

function BenchCard({ bench, index }: { bench: Bench; index: number }) {
  const [url, setUrl] = useState<string | null>(null)
  const [frameLoaded, setFrameLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [scale, setScale] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateScale = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) {
        setScale(width / 1280)
      }
    }

    updateScale()
    const ro = new ResizeObserver(updateScale)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    const timer = setTimeout(() => {
      fetch(`/__bench/${encodeURIComponent(bench.slug)}`, { signal: ac.signal })
        .then(async (res) => {
          const body = (await res.json()) as { url?: string; error?: string }
          if (!res.ok || !body.url) {
            throw new Error(body.error || `could not start ${bench.name}`)
          }
          setUrl(body.url)
        })
        .catch((err: unknown) => {
          if (!ac.signal.aborted) {
            console.error(err)
            setError(true)
          }
        })
    }, index * 60)

    return () => {
      clearTimeout(timer)
      ac.abort()
    }
  }, [bench.name, bench.slug, index])

  const displayName = getBenchDisplayName(bench)
  const lab = getLabForSlug(bench.slug)

  return (
    <Link to={`/b/${bench.slug}`} className="bench-card" aria-label={`Open ${displayName}`}>
      <div className="card-preview-wrapper" ref={containerRef}>
        <div className="card-browser-bar">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          {lab ? <ProviderLogo labId={lab.id} size={12} /> : null}
          <span className="preview-label">{displayName}</span>
        </div>
        <div className="card-preview-viewport">
          {url && scale ? (
            <div
              className="card-preview-scaler"
              style={{
                transform: `scale(${scale})`,
                opacity: frameLoaded ? 1 : 0,
              }}
            >
              <iframe
                src={url}
                title={`${displayName} preview`}
                tabIndex={-1}
                loading="lazy"
                onLoad={() => setFrameLoaded(true)}
              />
            </div>
          ) : null}

          {(!frameLoaded || !url) && !error && (
            <div className="card-skeleton">
              <div className="skeleton-pulse" />
              <span className="skeleton-text">Loading preview...</span>
            </div>
          )}

          {error && (
            <div className="card-error">
              <span>Preview unavailable</span>
            </div>
          )}
        </div>
      </div>
      <div className="card-meta">
        <div className="card-meta-left">
          {lab ? <ProviderLogo labId={lab.id} size={15} /> : null}
          <h2 className="card-title">{displayName}</h2>
        </div>
        <span className="card-link">
          Open
          <svg
            className="arrow-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

export function Component() {
  return (
    <main className="overview-page">
      <header className="overview-header">
        <div className="header-badge">Benchmark</div>
        <h1>lyricsbench</h1>
        <p className="overview-tagline">
          Select a frontier model to explore its player implementation.
        </p>
      </header>

      <section className="bench-grid" aria-label="Model previews">
        {benches.map((bench, index) => (
          <BenchCard key={bench.slug} bench={bench} index={index} />
        ))}
      </section>
    </main>
  )
}
