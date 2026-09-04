export type ThemeId = "velvet" | "booth" | "harbor" | "paper" | "signal"

export type Theme = {
  id: ThemeId
  name: string
  group: "dark" | "light"
}

export const themes: Theme[] = [
  { id: "velvet", name: "Velvet", group: "dark" },
  { id: "booth", name: "Booth", group: "dark" },
  { id: "harbor", name: "Harbor", group: "dark" },
  { id: "signal", name: "Signal", group: "dark" },
  { id: "paper", name: "Paper", group: "light" },
]

export const DEFAULT_THEME: ThemeId = "velvet"

export function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value)
}
