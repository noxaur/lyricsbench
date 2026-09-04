import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import { frontierLabs, getLabForSlug, ProviderLogo } from "./labs"

export function ModelChrome({
  currentSlug,
  currentName = "Models",
  standaloneUrl,
}: {
  currentSlug?: string
  currentName?: string
  standaloneUrl?: string
}) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const pillRef = useRef<HTMLDivElement>(null)
  const currentLab = currentSlug ? getLabForSlug(currentSlug) : undefined

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

  const orderedLabs = currentLab
    ? [currentLab, ...frontierLabs.filter((lab) => lab.id !== currentLab.id)]
    : frontierLabs

  return (
    <div className="stage-chrome" ref={pillRef}>
      <div className="chrome-pills">
        <Link to="/" className="home-pill" title="Home" aria-label="Home">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 10.5 12 3l9 7.5" />
            <path d="M5.5 9.5V21h13V9.5" />
          </svg>
        </Link>

        <button
          type="button"
          className={`model-pill ${isOpen ? "open" : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="Change model"
        >
          {currentLab ? <ProviderLogo labId={currentLab.id} size={15} /> : null}
          <span className="model-pill-name">{currentName}</span>
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
      </div>

      {isOpen ? (
        <div className="lab-dropdown-menu" role="menu">
          <div className="dropdown-header">
            <span className="dropdown-title">Models</span>
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
                      const isCurrent = model.slug === currentSlug

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
                          onClick={() => {
                            setIsOpen(false)
                            navigate(`/b/${model.slug}`)
                          }}
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

          {standaloneUrl ? (
            <a
              href={standaloneUrl}
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
  )
}
