import React, { useState } from "react"
import { X, Check, FileText, Search, PlusCircle } from "lucide-react"
import type { LyricsAlternate, LyricsResult } from "../types/lyrics"

type LyricsSourceModalProps = {
  isOpen: boolean
  onClose: () => void
  currentResult: LyricsResult | null
  alternates: LyricsAlternate[]
  onSelectAlternate: (result: LyricsResult) => void
  onApplyCustomLrc: (customLrc: string) => void
}

export function LyricsSourceModal({
  isOpen,
  onClose,
  currentResult,
  alternates,
  onSelectAlternate,
  onApplyCustomLrc,
}: LyricsSourceModalProps) {
  const [tab, setTab] = useState<"alternates" | "custom">("alternates")
  const [customText, setCustomText] = useState("")

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Lyrics Sources</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-border/40 px-5 pt-2 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("alternates")}
            className={`pb-2.5 transition-colors relative ${
              tab === "alternates"
                ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Found Sources ({alternates.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("custom")}
            className={`pb-2.5 transition-colors relative ${
              tab === "custom"
                ? "text-primary font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Paste Custom LRC
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {tab === "alternates" && (
            <div className="space-y-2.5">
              {alternates.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No alternate sources found for this track. You can paste custom LRC lyrics below.
                </div>
              ) : (
                alternates.map((alt, idx) => {
                  const isCurrent =
                    currentResult &&
                    currentResult.providerId === alt.providerId &&
                    currentResult.id === alt.lyricsResult.id

                  return (
                    <button
                      key={`${alt.providerId}-${alt.lyricsResult.id}-${idx}`}
                      type="button"
                      onClick={() => {
                        onSelectAlternate(alt.lyricsResult)
                        onClose()
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isCurrent
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 hover:border-border hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="text-sm font-semibold truncate">
                          {alt.trackName || "Unknown Track"}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {alt.artistName || "Unknown Artist"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${
                            alt.synced
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {alt.synced ? "Synced LRC" : "Plain Text"}
                        </span>
                        {isCurrent && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {tab === "custom" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Paste your own synced LRC (e.g. <code>[00:12.34]Lyric line</code>) or plain lyrics.
              </p>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="[00:12.34]First line&#10;[00:16.80]Second line..."
                rows={10}
                className="w-full p-3 font-mono text-xs bg-muted/30 border border-border/70 rounded-xl focus:ring-2 focus:ring-primary/60 outline-none resize-none"
              />
              <button
                type="button"
                disabled={!customText.trim()}
                onClick={() => {
                  onApplyCustomLrc(customText)
                  onClose()
                }}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs tracking-wide hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Apply Custom Lyrics
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
