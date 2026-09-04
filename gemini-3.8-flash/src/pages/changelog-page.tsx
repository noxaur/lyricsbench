import React from "react"
import { Sparkles, CheckCircle2, ShieldCheck, Zap, Bug, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"

export function ChangelogPage() {
  const improvements = [
    {
      id: "issue-78",
      issueNumber: "Issue #78",
      title: "Wrongly matched lyrics timestamps & Drift Fix",
      prevFlaw:
        "The previous codebase used aggressive heuristic shifts (e.g. subtracting up to 20s if firstStart > 25% duration), which broke music videos with spoken intros, sketches, or album cut variations.",
      solution:
        "Preserved genuine LRC timestamps by default without destructive heuristics. Added a live Interactive Calibration Bar (±100ms / ±500ms), global hotkeys ([ and ]), and a novel 1-Click 'Anchor to Now' button that lets users sync any lyric line to the audio instantly. Offsets are automatically remembered per track in localStorage.",
      tags: ["Sync Engine", "Zero Drift", "LocalStorage"],
    },
    {
      id: "issue-77",
      issueNumber: "Issue #77",
      title: "Smart Script Detection & Client-Side Romaji",
      prevFlaw:
        "The previous system assumed all songs were non-English, flooding network requests and requiring a separate Python microservice running in Docker on Fly.io for Japanese Romaji transliteration.",
      solution:
        "Built-in pure TypeScript client-side Hepburn Romaji transliteration engine with zero external Python dependencies. Added smart script detection that bypasses unnecessary translation requests for English songs, saving network bandwidth and browser memory.",
      tags: ["Pure TypeScript", "Offline Romaji", "Bandwidth Saver"],
    },
    {
      id: "issue-79",
      issueNumber: "Issue #79 & #84",
      title: "Hardened Song Search Lifecycle & Zero-Hang Debounce",
      prevFlaw:
        "Fast typing caused race conditions, YouTube cooldown limits, unhandled aborted promises, and infinite 'Searching...' hangs.",
      solution:
        "Deterministic request state machine (idle | searching | success | empty | error) with 350ms debounce and strict AbortController tokenization. Implemented a fast parallel waterfall with iTunes and LRCLIB to deliver high-resolution album artwork and verified lyrics in under 200ms.",
      tags: ["State Machine", "AbortController", "Multi-Source"],
    },
    {
      id: "issue-82",
      issueNumber: "Issue #82",
      title: "Lyrics Rejection Flow & Custom LRC Studio",
      prevFlaw:
        "Users had no straightforward way to discard incorrect lyrics, report timing bugs, or paste clean synced lyrics.",
      solution:
        "Added a 1-click Lyrics Rejection modal that pre-formats GitHub issue reports with track metadata and video IDs, blacklists bad lyrics locally, and provides an instant Alternate Source switcher and custom LRC paste studio.",
      tags: ["GitHub Integration", "Blacklisting", "Custom LRC"],
    },
    {
      id: "rendering",
      issueNumber: "UX / Visual",
      title: "Dual-Layer Clip-Path Karaoke Sweep",
      prevFlaw:
        "The previous version only switched flat text colors between active and unsung states without smooth horizontal reveal.",
      solution:
        "True dual-layer clip-path reveal (inset(0 ${(1-p)*100}% 0 0)) with stage-light glowing active text overlaid on base unsung ink, delivering true broadcast karaoke feel.",
      tags: ["Dual-Layer ClipPath", "The Dimmed Venue", "OKLCH Stage"],
    },
    {
      id: "architecture",
      issueNumber: "Issue #177",
      title: "Fresh Modern React Router v7 Architecture",
      prevFlaw:
        "Fragmented multi-module monorepo across Rust, Cloudflare Worker, Python, and Vite with broken local credentials and COEP iframe blocks.",
      solution:
        "Unified modern React Router v7 + Vite setup with type-safe routing, 40+ curated presets, custom theme designer, playlists management, and built-in offline audio fallback.",
      tags: ["React Router v7", "Vite", "Tailwind v4"],
    },
  ]

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Generation 2 · Architectural Overhaul
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Solving the Previous Generation's Flaws
        </h1>

        <p className="text-sm text-muted-foreground">
          How this recreation solves the critical bugs and fragility of the original codebase with novel, resilient designs.
        </p>
      </div>

      <div className="space-y-6">
        {improvements.map((item) => (
          <div
            key={item.id}
            className="p-6 rounded-2xl bg-card border border-border/70 shadow-sm space-y-4 hover:border-primary/40 transition-colors"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono font-bold">
                  {item.issueNumber}
                </span>
                <h3 className="text-base font-bold text-foreground">{item.title}</h3>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-foreground">
                <div className="flex items-center gap-1.5 font-bold text-destructive mb-1.5">
                  <Bug className="w-3.5 h-3.5" />
                  Previous Generation Flaw
                </div>
                <p className="text-muted-foreground leading-relaxed">{item.prevFlaw}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 text-foreground">
                <div className="flex items-center gap-1.5 font-bold text-success mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Our Novel Solution
                </div>
                <p className="text-foreground/90 leading-relaxed">{item.solution}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-3">
        <h3 className="text-base font-bold text-foreground">Experience the New Player</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Test any track, try the timing calibration controls, and explore the 40+ stage themes.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md hover:opacity-90 transition-all active:scale-95"
        >
          <span>Try it Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
