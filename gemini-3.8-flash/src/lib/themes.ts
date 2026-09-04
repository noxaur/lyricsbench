import type { Theme, ThemeTokens } from "../types/theme"
import { generatedTintedThemes } from "./generated-tinted-themes"

export const THEME_STORAGE_KEY = "umbra-theme-id"
export const THEME_CACHE_KEY = "umbra-theme-cache"
export const CUSTOM_THEMES_KEY = "umbra-custom-themes"

export const DEFAULT_DARK_THEME_ID = "gruvbox-dark-hard"
export const DEFAULT_LIGHT_THEME_ID = "gruvbox-light-soft"

export const presetThemes: Theme[] = generatedTintedThemes

const TOKEN_CSS_MAP: Record<keyof ThemeTokens, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  border: "--border",
  input: "--input",
  ring: "--ring",
  karaokeActive: "--karaoke-active",
  karaokeMuted: "--karaoke-muted",
  karaokeUnsung: "--karaoke-unsung",
  karaokeStageBg: "--karaoke-stage-bg",
}

export function getCustomThemes(): Theme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Theme[]
  } catch {
    return []
  }
}

export function saveCustomTheme(theme: Theme): void {
  const custom = getCustomThemes().filter((t) => t.id !== theme.id)
  custom.push(theme)
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(custom))
}

export function deleteCustomTheme(id: string): void {
  const custom = getCustomThemes().filter((t) => t.id !== id)
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(custom))
}

export function getAllThemes(): Theme[] {
  return [...presetThemes, ...getCustomThemes()]
}

export function getThemeById(id: string): Theme {
  const all = getAllThemes()
  return all.find((t) => t.id === id) || all.find((t) => t.id === DEFAULT_DARK_THEME_ID) || presetThemes[0]
}

export function persistThemeId(id: string): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    // ignore
  }
}

export function applyThemeToElement(element: HTMLElement, theme: Theme): void {
  element.setAttribute("data-theme", theme.id)
  element.classList.remove("light", "dark")
  element.classList.add(theme.category === "dark" ? "dark" : "light")

  for (const [key, cssVar] of Object.entries(TOKEN_CSS_MAP) as [keyof ThemeTokens, string][]) {
    if (theme.tokens[key]) {
      element.style.setProperty(cssVar, theme.tokens[key])
    }
  }

  // Also cache for immediate head script execution
  try {
    localStorage.setItem(
      THEME_CACHE_KEY,
      JSON.stringify({
        id: theme.id,
        category: theme.category,
        tokens: theme.tokens,
      }),
    )
    persistThemeId(theme.id)
  } catch {
    // ignore
  }
}

export function getStoredThemeId(): string {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored) return stored
  } catch {
    // ignore
  }
  return DEFAULT_DARK_THEME_ID
}
