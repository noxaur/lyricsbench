export type ThemeCategory = "dark" | "light"

export type ThemeTokens = {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  border: string
  input: string
  ring: string
  karaokeActive: string
  karaokeMuted: string
  karaokeUnsung: string
  karaokeStageBg: string
}

export type Theme = {
  id: string
  name: string
  description: string
  category: ThemeCategory
  tokens: ThemeTokens
}
