import React, { useState } from "react"
import { Palette, X, Plus, Check } from "lucide-react"
import { Link } from "react-router-dom"
import { useTheme } from "./theme-provider"

type ThemeSelectorModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function ThemeSelectorModal({ isOpen, onClose }: ThemeSelectorModalProps) {
  const { theme, setThemeId, allThemes } = useTheme()
  const [filter, setFilter] = useState<"all" | "dark" | "light">("all")

  if (!isOpen) return null

  const filtered = allThemes.filter((t) => {
    if (filter === "all") return true
    return t.category === filter
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Theme Gallery</h3>
            <span className="text-xs text-muted-foreground">({allThemes.length} presets)</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/themes/build"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Build Custom
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center px-6 py-2.5 border-b border-border/40 gap-2 text-xs">
          {(["all", "dark", "light"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full uppercase tracking-wider font-semibold transition-all ${
                filter === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Theme Grid */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((t) => {
            const isSelected = t.id === theme.id

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setThemeId(t.id)}
                className={`p-3.5 rounded-xl border text-left flex flex-col gap-2.5 transition-all relative group ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/40 bg-card shadow-md"
                    : "border-border/60 hover:border-border hover:bg-muted/30"
                }`}
                style={{ backgroundColor: t.tokens.background }}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: t.tokens.foreground }}
                  >
                    {t.name}
                  </span>
                  {isSelected && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                      style={{
                        backgroundColor: t.tokens.primary,
                        color: t.tokens.primaryForeground,
                      }}
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Color swatches preview */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-md border border-white/10 shadow-sm"
                    style={{ backgroundColor: t.tokens.primary }}
                    title="Primary"
                  />
                  <span
                    className="w-5 h-5 rounded-md border border-white/10 shadow-sm"
                    style={{ backgroundColor: t.tokens.accent }}
                    title="Accent"
                  />
                  <span
                    className="w-5 h-5 rounded-md border border-white/10 shadow-sm"
                    style={{ backgroundColor: t.tokens.card }}
                    title="Card Surface"
                  />
                  <span
                    className="w-5 h-5 rounded-md border border-white/10 shadow-sm"
                    style={{ backgroundColor: t.tokens.karaokeActive }}
                    title="Karaoke Active"
                  />
                  <span
                    className="text-[10px] uppercase font-mono ml-auto opacity-70"
                    style={{ color: t.tokens.mutedForeground }}
                  >
                    {t.category}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
