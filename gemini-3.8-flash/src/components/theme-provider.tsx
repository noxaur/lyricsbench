import React, { createContext, useContext, useEffect, useState } from "react"
import type { Theme } from "../types/theme"
import {
  applyThemeToElement,
  getAllThemes,
  getStoredThemeId,
  getThemeById,
  persistThemeId,
} from "../lib/themes"

type ThemeContextType = {
  theme: Theme
  setThemeId: (id: string) => void
  allThemes: Theme[]
  refreshThemes: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(() => getStoredThemeId())
  const [allThemes, setAllThemes] = useState<Theme[]>(() => getAllThemes())

  const theme = getThemeById(themeId)

  useEffect(() => {
    applyThemeToElement(document.documentElement, theme)
  }, [theme])

  const setThemeId = (id: string) => {
    setThemeIdState(id)
    persistThemeId(id)
    const t = getThemeById(id)
    applyThemeToElement(document.documentElement, t)
  }

  const refreshThemes = () => {
    setAllThemes(getAllThemes())
  }

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, allThemes, refreshThemes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return ctx
}
