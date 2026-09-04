import React, { useState } from "react"
import { AlertTriangle, ExternalLink, ThumbsDown, X } from "lucide-react"
import type { LyricsResult } from "../types/lyrics"
import { addRejectedLyric } from "../lib/lyrics-service"

type LyricsRejectionModalProps = {
  isOpen: boolean
  onClose: () => void
  lyricsResult: LyricsResult | null
  videoId: string
  trackTitle?: string
  artist?: string
  onRejected: () => void
}

const REASONS = [
  { id: "timing", label: "Timestamps out of sync / bad timing drift" },
  { id: "wrong_song", label: "Completely wrong song / lyrics for another track" },
  { id: "instrumental", label: "Track is instrumental (has no vocals)" },
  { id: "formatting", label: "Broken formatting, missing lines, or garbled text" },
  { id: "other", label: "Other issue" },
]

export function LyricsRejectionModal({
  isOpen,
  onClose,
  lyricsResult,
  videoId,
  trackTitle,
  artist,
  onRejected,
}: LyricsRejectionModalProps) {
  const [reason, setReason] = useState("timing")
  const [comment, setComment] = useState("")

  if (!isOpen || !lyricsResult) return null

  const handleReject = (reportToGithub: boolean) => {
    const identifier = `${lyricsResult.providerId}-${lyricsResult.id}`
    addRejectedLyric(identifier)

    if (reportToGithub) {
      const titleParam = encodeURIComponent(`[Lyrics Bug] ${artist || "Unknown"} - ${trackTitle || videoId}`)
      const body = encodeURIComponent(`### Lyrics Issue Report

- **Track**: ${trackTitle || "N/A"}
- **Artist**: ${artist || "N/A"}
- **YouTube Video ID**: ${videoId} (https://www.youtube.com/watch?v=${videoId})
- **Lyrics Provider**: ${lyricsResult.providerId} (ID: ${lyricsResult.id})
- **Reason**: ${reason}
- **User Notes**: ${comment.trim() || "None"}

---
*Reported automatically via Umbra Lyrics Player*`)

      const githubUrl = `https://github.com/noxaur/umbra-lyrics/issues/new?title=${titleParam}&body=${body}`
      window.open(githubUrl, "_blank", "noopener,noreferrer")
    }

    onRejected()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-destructive">
            <ThumbsDown className="w-5 h-5" />
            <h3 className="text-base font-semibold text-foreground">Reject Lyrics</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-muted-foreground">
            Rejecting this match will blacklist it on this browser and allow you to pick an alternate source or paste your own.
          </p>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1">
            <div className="font-semibold text-foreground text-sm truncate">
              {trackTitle || "Current Track"}
            </div>
            <div className="text-muted-foreground truncate">{artist || "Unknown Artist"}</div>
            <div className="font-mono text-[10px] text-muted-foreground/70">
              Provider: {lyricsResult.providerId} · ID: {lyricsResult.id}
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-foreground block">Select Reason:</label>
            <div className="space-y-1.5">
              {REASONS.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 cursor-pointer text-foreground"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.id}
                    checked={reason === r.id}
                    onChange={(e) => setReason(e.target.value)}
                    className="accent-primary"
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-foreground block">Additional Details (optional):</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. intro is 15s longer in music video edit..."
              rows={3}
              className="w-full p-2.5 bg-muted/30 border border-border/70 rounded-xl focus:ring-2 focus:ring-primary/60 outline-none resize-none text-xs"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleReject(true)}
              className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-xs tracking-wide hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Reject & Open GitHub Issue
            </button>
            <button
              type="button"
              onClick={() => handleReject(false)}
              className="w-full py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium text-xs transition-colors"
            >
              Reject Locally Only
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
