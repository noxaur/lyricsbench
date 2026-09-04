import { useEffect, useState } from "react"
import { useParams } from "react-router"
import { benchBySlug, getBenchDisplayName } from "../benches"
import { boothSrc } from "../booth"
import { ModelChrome } from "../model-chrome"

type Status =
  | { kind: "cueing" }
  | { kind: "live"; url: string }
  | { kind: "fault"; message: string }

export function Component() {
  const { slug = "" } = useParams()
  const bench = benchBySlug(slug)
  const [status, setStatus] = useState<Status>({ kind: "cueing" })
  const currentDisplayName = bench ? getBenchDisplayName(bench) : "Select a model"

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

  return (
    <main className="stage">
      <ModelChrome
        currentSlug={bench?.slug}
        currentName={currentDisplayName}
        standaloneUrl={status.kind === "live" ? status.url : undefined}
      />

      {!bench ? (
        <div className="stage-fault">
          <h1>Model not found</h1>
          <p>Open the pill to pick an available model, or return home.</p>
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
