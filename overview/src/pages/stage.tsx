import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { benchBySlug, getBenchDisplayName } from "../benches"
import { boothSrc } from "../booth"
import { frontierLabs, getLabForSlug, ProviderLogo } from "../labs"

type Status =
  | { kind: "cueing" }
  | { kind: "live"; url: string }
  | { kind: "fault"; message: string }

export function Component() {
  const { slug = "" } = useParams()
  const navigate = useNavigate()
  const bench = benchBySlug(slug)
  const [status, setStatus] = useState<Status>({ kind: "cueing" })
  const [isOpen, setIsOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)

  const currentLab = bench ? getLabForSlug(bench.slug) : undefined
  const currentDisplayName = bench ? getBenchDisplayName(bench) : "Select a model"

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!bench) return
    if (import.meta.env.PROD) {
      setStatus({ kind: "live", url: boothSrc(bench.slug) })
      return
    }

    const ac = new AbortController()
    setStatus({ kind: "cueing" })

    fetch(`/__bench/${encodeURIComponent(bench.slug)}`, { signal: ac.signal })
      .then(async (res) => {
        const body = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !body.url) {
          throw new Error(body.error || `could not start ${bench.name}`)
        }
        setStatus({ kind: "live", url: body.url })
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return
        setStatus({
          kind: "fault",
          message: err instanceof Error ? err.message : "could not start this model booth",
        })
      })

    return () => ac.abort()
  }, [bench])

  const handleSelectModel = (targetSlug?: string) => {
    if (!targetSlug) return
    setIsOpen(false)
    navigate(`/b/${targetSlug}`)
  }

  const orderedLabs = currentLab
    ? [currentLab, ...frontierLabs.filter((lab) => lab.id !== currentLab.id)]
    : frontierLabs

  return (
    <main className="stage">
      <div className="stage-chrome" ref={pillRef}>
        <button
          type="button"
          className={`model-pill ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="Change model"
        >
          {currentLab ? <ProviderLogo labId={currentLab.id} size={15} /> : null}
          <span className="model-pill-name">{currentDisplayName}</span>
          <svg
            className={`chevron-icon ${isOpen ? "rotate" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {isOpen ? (
          <div className="lab-dropdown-menu" role="menu">
            <div className="dropdown-header">
              <span className="dropdown-title">Models</span>
              <Link className="dropdown-home" to="/" onClick={() => setIsOpen(false)}>
                Overview
              </Link>
            </div>

            <div className="dropdown-labs-list">
              {orderedLabs.map((lab) => {
                const isCurrentLab = lab.id === currentLab?.id
                return (
                  <div
                    key={lab.id}
                    className={`dropdown-lab-section ${isCurrentLab ? "current-lab" : ""}`}
                  >
                    <div className="dropdown-lab-row">
                      <ProviderLogo labId={lab.id} size={14} />
                      <span className="dropdown-lab-name">{lab.name}</span>
                    </div>

                    <div className="dropdown-models-sublist">
                      {lab.models.map((model) => {
                        const isLive = model.status === "live" && model.slug
                        const isCurrent = model.slug === bench?.slug

                        if (!isLive) {
                          return (
                            <div
                              key={model.id}
                              className="dropdown-model-row coming-soon"
                              title="Coming soon"
                            >
                              <span className="model-row-left">
                                <ProviderLogo labId={lab.id} size={13} />
                                <span className="model-name-text">{model.name}</span>
                              </span>
                              <span className="coming-soon-pill">soon</span>
                            </div>
                          )
                        }

                        return (
                          <button
                            key={model.id}
                            type="button"
                            className={`dropdown-model-row live ${isCurrent ? "current" : ""}`}
                            onClick={() => handleSelectModel(model.slug)}
                          >
                            <span className="model-row-left">
                              <ProviderLogo labId={lab.id} size={13} />
                              <span className="model-name-text">{model.name}</span>
                            </span>
                            {isCurrent ? (
                              <span className="current-indicator">
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              </span>
                            ) : (
                              <span className="live-pill">Live</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {status.kind === "live" ? (
              <a
                href={status.url}
                target="_blank"
                rel="noreferrer"
                className="dropdown-external"
              >
                Open standalone
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {!bench ? (
        <div className="stage-fault">
          <h1>Model not found</h1>
          <p>Open the pill to pick an available model, or return to the overview.</p>
        </div>
      ) : null}

      {bench && status.kind === "cueing" ? (
        <div className="stage-cue">
          <div className="stage-spinner" />
          <h1>Starting {currentDisplayName}</h1>
          <p>{import.meta.env.PROD ? "Loading the booth..." : "Booting the dev server..."}</p>
        </div>
      ) : null}

      {bench && status.kind === "fault" ? (
        <div className="stage-fault">
          <h1>Could not load {currentDisplayName}</h1>
          <p>{status.message}</p>
        </div>
      ) : null}

      {bench && status.kind === "live" ? (
        <iframe
          className="stage-viewport"
          title={currentDisplayName}
          src={status.url}
          allow="autoplay; fullscreen; encrypted-media; clipboard-read; clipboard-write"
        />
      ) : null}
    </main>
  )
}
