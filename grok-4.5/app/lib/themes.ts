export type ThemeId = "ember" | "night" | "moss" | "day"

export type Theme = {
  id: ThemeId
  name: string
  group: "dark" | "light"
}

export const themes: Theme[] = [
  { id: "ember", name: "Ember", group: "dark" },
  { id: "night", name: "Night", group: "dark" },
  { id: "moss", name: "Moss", group: "dark" },
  { id: "day", name: "Day", group: "light" },
]

export const DEFAULT_THEME: ThemeId = "ember"

export function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value)
}
