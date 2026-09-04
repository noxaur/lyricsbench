import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Sparkles, Check } from "lucide-react"
import type { Theme, ThemeTokens } from "../types/theme"
import { saveCustomTheme } from "../lib/themes"
import { useTheme } from "../components/theme-provider"
import { KaraokeWordProgress } from "../components/karaoke-word-progress"

export function ThemeBuilderPage() {
  const navigate = useNavigate()
  const { setThemeId, refreshThemes } = useTheme()

  const [name, setName] = useState("Midnight Neon")
  const [category, setCategory] = useState<"dark" | "light">("dark")
  const [tokens, setTokens] = useState<ThemeTokens>({
    background: "#0d0b14",
    foreground: "#f3f0f7",
    card: "#181424",
    cardForeground: "#f3f0f7",
    popover: "#181424",
    popoverForeground: "#f3f0f7",
    primary: "#d946ef",
    primaryForeground: "#0d0b14",
    secondary: "#261f38",
    secondaryForeground: "#f3f0f7",
    muted: "#261f38",
    mutedForeground: "#8e84a3",
    accent: "#06b6d4",
    accentForeground: "#0d0b14",
    destructive: "#ef4444",
    border: "#32294a",
    input: "#32294a",
    ring: "#d946ef",
    karaokeActive: "#f472b6",
    karaokeMuted: "#6b5d8a",
    karaokeUnsung: "#6b5d8a80",
    karaokeStageBg: "#0d0b14",
  })

  const handleColorChange = (key: keyof ThemeTokens, value: string) => {
    setTokens((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "background" ? { karaokeStageBg: value } : {}),
      ...(key === "primary" ? { ring: value, karaokeActive: value } : {}),
    }))
  }

  const handleSave = () => {
    if (!name.trim()) return
    const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`
    const newTheme: Theme = {
      id,
      name: name.trim(),
      description: "Custom designed stage theme",
      category,
      tokens,
    }
    saveCustomTheme(newTheme)
    refreshThemes()
    setThemeId(id)
    navigate("/themes")
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
      <button
        type="button"
        onClick={() => navigate("/themes")}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Themes
      </button>

      <div className="flex items-center justify-between pb-6 mb-8 border-b border-border/50">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Theme Designer
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Build and test custom palette tokens with instant stage preview.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-md active:scale-95"
        >
          <Check className="w-4 h-4" />
          Save & Apply
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/60">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Theme Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-muted/40 border border-border/60 rounded-xl text-xs text-foreground focus:ring-2 focus:ring-primary/60 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Category</label>
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                      category === cat
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Color token pickers */}
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border/60 text-xs">
            <h3 className="font-bold text-foreground mb-3">Color Tokens</h3>

            {[
              { key: "background" as const, label: "Stage Background" },
              { key: "card" as const, label: "Card / Surface" },
              { key: "foreground" as const, label: "Text Foreground" },
              { key: "primary" as const, label: "Stage Light Accent" },
              { key: "accent" as const, label: "Secondary Accent" },
              { key: "karaokeActive" as const, label: "Active Singing Lyric" },
              { key: "karaokeMuted" as const, label: "Muted / Unsung Lyric" },
              { key: "border" as const, label: "Borders & Lines" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between py-1">
                <span className="text-muted-foreground font-medium">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tokens[key].slice(0, 7)}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border/60 bg-transparent"
                  />
                  <input
                    type="text"
                    value={tokens[key]}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="w-24 px-2 py-1 bg-muted/40 border border-border/60 rounded-lg font-mono text-[11px] text-foreground text-center"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Live Stage Simulator</span>
            <span>Real-time preview of your theme</span>
          </div>

          <div
            className="w-full aspect-[4/3] rounded-3xl p-8 flex flex-col justify-between items-center text-center shadow-2xl border transition-colors overflow-hidden relative"
            style={{
              backgroundColor: tokens.background,
              borderColor: tokens.border,
              color: tokens.foreground,
            }}
          >
            {/* Mock Header */}
            <div className="w-full flex items-center justify-between pb-4 border-b" style={{ borderColor: tokens.border }}>
              <div className="text-left">
                <div className="text-xs font-bold" style={{ color: tokens.foreground }}>
                  Queen – Bohemian Rhapsody
                </div>
                <div className="text-[10px]" style={{ color: tokens.mutedForeground }}>
                  A Night at the Opera
                </div>
              </div>
              <div
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: tokens.card,
                  color: tokens.primary,
                  borderColor: tokens.border,
                }}
              >
                Synced LRC
              </div>
            </div>

            {/* Mock Lyrics Lines */}
            <div className="my-auto space-y-4 w-full">
              <div
                className="text-sm font-medium opacity-50"
                style={{ color: tokens.karaokeMuted }}
              >
                Is this the real life?
              </div>

              {/* Active Singing Line */}
              <div
                className="text-2xl sm:text-3xl font-extrabold tracking-tight scale-105"
                style={{ color: tokens.karaokeActive }}
              >
                <KaraokeWordProgress
                  text="Caught in a landslide, no escape from reality"
                  progress={0.7}
                  activeLine={true}
                />
              </div>

              <div
                className="text-sm font-medium opacity-50"
                style={{ color: tokens.karaokeMuted }}
              >
                Open your eyes, look up to the skies and see
              </div>
            </div>

            {/* Mock Transport Bottom */}
            <div
              className="w-full p-3 rounded-2xl flex items-center justify-between text-xs"
              style={{
                backgroundColor: tokens.card,
                borderColor: tokens.border,
              }}
            >
              <div className="font-mono text-[11px]" style={{ color: tokens.mutedForeground }}>
                0:11 / 5:55
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shadow"
                style={{
                  backgroundColor: tokens.primary,
                  color: tokens.primaryForeground,
                }}
              >
                ▶
              </div>
              <div className="text-[10px] font-mono" style={{ color: tokens.mutedForeground }}>
                1.0x
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
