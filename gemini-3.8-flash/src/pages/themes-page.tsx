import React, { useState } from "react"
import { Link } from "react-router-dom"
import { Sparkles, Plus, Check, Trash2 } from "lucide-react"
import { useTheme } from "../components/theme-provider"
import { deleteCustomTheme, getCustomThemes } from "../lib/themes"

export function ThemesPage() {
  const { theme, setThemeId, allThemes, refreshThemes } = useTheme()
  const [filter, setFilter] = useState<"all" | "dark" | "light" | "custom">("all")
  const customThemes = getCustomThemes()

  const filtered = allThemes.filter((t) => {
    if (filter === "all") return true
    if (filter === "custom") return customThemes.some((ct) => ct.id === t.id)
    return t.category === filter
  })

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteCustomTheme(id)
    refreshThemes()
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-primary" />
            Stage Themes
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            40+ OKLCH and tinted palettes designed for dimmed venue karaoke immersion.
          </p>
        </div>

        <Link
          to="/themes/build"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Theme Designer
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 text-xs">
        {(["all", "dark", "light", "custom"] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={`px-3.5 py-1.5 rounded-xl uppercase font-semibold tracking-wider transition-all ${
              filter === cat
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat} {cat === "custom" ? `(${customThemes.length})` : ""}
          </button>
        ))}
      </div>

      {/* Theme Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => {
          const isSelected = t.id === theme.id
          const isCustom = customThemes.some((ct) => ct.id === t.id)

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 relative group shadow-sm hover:shadow-md ${
                isSelected
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border/60 hover:border-border"
              }`}
              style={{
                backgroundColor: t.tokens.background,
                color: t.tokens.foreground,
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm truncate">{t.name}</h3>
                  {isSelected ? (
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-sm"
                      style={{
                        backgroundColor: t.tokens.primary,
                        color: t.tokens.primaryForeground,
                      }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  ) : isCustom ? (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDeleteCustom(t.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          handleDeleteCustom(t.id, e as any)
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-black/20 text-muted-foreground transition-opacity"
                      title="Delete Custom Theme"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  ) : null}
                </div>

                <p
                  className="text-xs line-clamp-2 mb-4 opacity-70"
                  style={{ color: t.tokens.mutedForeground }}
                >
                  {t.description}
                </p>
              </div>

              {/* Color swatches preview */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.tokens.primary }}
                    title="Primary"
                  />
                  <span
                    className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.tokens.accent }}
                    title="Accent"
                  />
                  <span
                    className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.tokens.card }}
                    title="Card Surface"
                  />
                  <span
                    className="w-5 h-5 rounded-md border border-white/20 shadow-sm"
                    style={{ backgroundColor: t.tokens.karaokeActive }}
                    title="Active Karaoke Lyric"
                  />
                </div>

                <span
                  className="text-[10px] font-mono uppercase tracking-wider opacity-60"
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
  )
}
