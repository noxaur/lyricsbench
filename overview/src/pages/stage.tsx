import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { benchBySlug, benches, getBenchDisplayName } from "../benches"
import { boothSrc } from "../booth"
import {
  frontierLabs,
  getLabForSlug,
  ProviderLogo,
  type FrontierLab,
  type LabModel,
} from "../labs"

type Status =
  | { kind: "cueing" }
  | { kind: "live"; url: string }
  | { kind: "fault"; message: string }

export function Component() {
  const { slug = "" } = useParams()
  const navigate = useNavigate()
  const bench = benchBySlug(slug)
  const [status, setStatus] = useState<Status>({ kind: "cueing" })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [labFilter, setLabFilter] = useState<string>("all")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentLab = bench ? getLabForSlug(bench.slug) : undefined

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isDropdownOpen])

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

  if (!bench) {
    return (
      <main className="stage">
        <header className="stage-header">
          <div className="stage-left">
            <Link className="stage-back" to="/">
              <span className="back-arrow">←</span> Overview
            </Link>
          </div>
        </header>
        <div className="stage-fault">
          <h1>Model not found</h1>
          <p>Please return to the overview to select an available model.</p>
        </div>
      </main>
    )
  }

  const currentDisplayName = getBenchDisplayName(bench)

  // Keep max 5 models viewed in the quick bar as currently
  // If labFilter is "all", show the 5 live models. If a lab is selected, show that lab's models (max 5).
  const visibleModels: { model: LabModel; lab: FrontierLab }[] = (() => {
    if (labFilter !== "all") {
      const lab = frontierLabs.find((l) => l.id === labFilter)
      if (lab) {
        return lab.models.slice(0, 5).map((m) => ({ model: m, lab }))
      }
    }
    // Default: live benchmarked models (capped at 5)
    const list: { model: LabModel; lab: FrontierLab }[] = []
    for (const b of benches.slice(0, 5)) {
      const l = getLabForSlug(b.slug)
      if (l) {
        const m = l.models.find((item) => item.slug === b.slug)
        if (m) {
          list.push({ model: m, lab: l })
        }
      }
    }
    return list
  })()

  // Filtered labs for the dropdown list
  const displayLabs = labFilter === "all"
    ? frontierLabs
    : frontierLabs.filter((l) => l.id === labFilter)

  const handleSelectModel = (targetSlug?: string) => {
    if (!targetSlug) return
    setIsDropdownOpen(false)
    navigate(`/b/${targetSlug}`)
  }

  return (
    <main className="stage">
      <header className="stage-header">
        <div className="stage-left">
          <Link className="stage-back" to="/" title="Return to overview">
            <span className="back-arrow">←</span>
            <span className="back-text">Overview</span>
          </Link>
          <span className="stage-sep">/</span>
          <div className="stage-current-badge">
            {currentLab ? (
              <ProviderLogo labId={currentLab.id} size={15} />
            ) : null}
            <span className="stage-current-name">{currentDisplayName}</span>
          </div>
        </div>

        <div className="stage-right">
          {/* Quick Model Pills (max 5 visible) */}
          <nav className="model-picker" aria-label="Quick model switcher">
            {visibleModels.map(({ model, lab }) => {
              const isLive = model.status === "live" && model.slug
              const isActive = model.slug === bench.slug

              if (!isLive) {
                return (
                  <span
                    key={model.id}
                    className="model-tab disabled"
                    title={`${model.name} — Coming soon`}
                  >
                    <ProviderLogo labId={lab.id} size={13} />
                    <span className="tab-name">{model.name}</span>
                    <span className="tab-badge">Soon</span>
                  </span>
                )
              }

              return (
                <Link
                  key={model.id}
                  to={`/b/${model.slug}`}
                  className={`model-tab ${isActive ? "active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <ProviderLogo labId={lab.id} size={13} />
                  <span className="tab-name">{model.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Frontier Labs Dropdown Selector */}
          <div className="dropdown-container" ref={dropdownRef}>
            <button
              type="button"
              className={`lab-dropdown-trigger ${isDropdownOpen ? "open" : ""}`}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-expanded={isDropdownOpen}
              aria-haspopup="true"
              title="Select frontier labs & models"
            >
              <span className="trigger-icon">
                {currentLab ? (
                  <ProviderLogo labId={currentLab.id} size={14} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              <span className="trigger-label">
                {labFilter === "all" ? "Frontier Labs" : (frontierLabs.find(l => l.id === labFilter)?.shortName || "Labs")}
              </span>
              <svg
                className={`chevron-icon ${isDropdownOpen ? "rotate" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isDropdownOpen && (
              <div className="lab-dropdown-menu" role="menu">
                <div className="dropdown-header">
                  <span className="dropdown-title">Frontier Labs</span>
                  <span className="dropdown-count">{frontierLabs.length} providers</span>
                </div>

                {/* Lab Filter Chips */}
                <div className="dropdown-filter-chips">
                  <button
                    type="button"
                    className={`filter-chip ${labFilter === "all" ? "active" : ""}`}
                    onClick={() => setLabFilter("all")}
                  >
                    All
                  </button>
                  {frontierLabs.map((lab) => (
                    <button
                      key={lab.id}
                      type="button"
                      className={`filter-chip ${labFilter === lab.id ? "active" : ""}`}
                      onClick={() => setLabFilter(lab.id)}
                    >
                      <ProviderLogo labId={lab.id} size={11} />
                      <span>{lab.shortName}</span>
                    </button>
                  ))}
                </div>

                {/* Labs & Models List */}
                <div className="dropdown-labs-list">
                  {displayLabs.map((lab) => (
                    <div key={lab.id} className="dropdown-lab-section">
                      <div className="dropdown-lab-row">
                        <ProviderLogo labId={lab.id} size={14} />
                        <span className="dropdown-lab-name">{lab.name}</span>
                      </div>

                      <div className="dropdown-models-sublist">
                        {lab.models.map((model) => {
                          const isLive = model.status === "live" && model.slug
                          const isCurrent = model.slug === bench.slug

                          if (!isLive) {
                            return (
                              <div
                                key={model.id}
                                className="dropdown-model-row coming-soon"
                                title="Coming soon"
                              >
                                <span className="model-name-text">{model.name}</span>
                                <span className="coming-soon-pill">coming soon</span>
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
                              <span className="model-name-text">{model.name}</span>
                              {isCurrent ? (
                                <span className="current-indicator">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* External Window Shortcut */}
          {status.kind === "live" ? (
            <a
              href={status.url}
              target="_blank"
              rel="noreferrer"
              className="stage-external-btn"
              title="Open standalone page in new window"
            >
              <svg
                width="14"
                height="14"
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
      </header>

      {status.kind === "cueing" ? (
        <div className="stage-cue">
          <div className="stage-spinner" />
          <h1>Starting {currentDisplayName}</h1>
          <p>{import.meta.env.PROD ? "Loading the booth..." : "Booting the dev server..."}</p>
        </div>
      ) : null}

      {status.kind === "fault" ? (
        <div className="stage-fault">
          <h1>Could not load {currentDisplayName}</h1>
          <p>{status.message}</p>
        </div>
      ) : null}

      {status.kind === "live" ? (
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
