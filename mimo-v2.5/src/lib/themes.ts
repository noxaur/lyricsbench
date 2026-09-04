export type ThemeToken = {
  name: string;
  tokens: Record<string, string>;
};

export const defaultTheme: ThemeToken = {
  name: "default",
  tokens: {
    "--color-background": "oklch(0.1 0.025 280)",
    "--color-foreground": "oklch(0.95 0.01 280)",
    "--color-card": "oklch(0.16 0.025 280)",
    "--color-primary": "oklch(0.72 0.28 320)",
    "--color-primary-foreground": "oklch(0.12 0.02 280)",
    "--color-secondary": "oklch(0.22 0.03 280)",
    "--color-secondary-foreground": "oklch(0.95 0.01 280)",
    "--color-muted": "oklch(0.22 0.03 280)",
    "--color-muted-foreground": "oklch(0.65 0.03 280)",
    "--color-border": "oklch(0.28 0.03 280)",
    "--color-ring": "oklch(0.72 0.28 320)",
    "--color-accent": "oklch(0.22 0.03 280)",
    "--color-accent-foreground": "oklch(0.95 0.01 280)",
    "--color-destructive": "oklch(0.65 0.2 25)",
    "--color-lyric-active": "oklch(0.78 0.3 320)",
    "--color-lyric-muted": "oklch(0.5 0.04 280)",
    "--color-lyric-unsung": "oklch(0.5 0.04 280 / 0.7)",
    "--color-stage-violet": "oklch(0.72 0.28 320)",
    "--color-surface-card": "oklch(0.16 0.025 280)",
    "--color-surface-muted": "oklch(0.22 0.03 280)",
    "--color-ink-primary": "oklch(0.95 0.01 280)",
    "--color-ink-muted": "oklch(0.65 0.03 280)",
    "--color-border-subtle": "oklch(0.28 0.03 280)",
    "--color-status-success": "oklch(0.72 0.16 155)",
    "--color-status-warning": "oklch(0.78 0.14 75)",
    "--color-status-info": "oklch(0.74 0.12 240)",
    "--color-input": "oklch(0.28 0.03 280)",
  },
};

// Tinted Themes base16 presets
const THEMES: ThemeToken[] = [
  {
    name: "tokyo-night",
    tokens: {
      "--color-background": "oklch(0.15 0.02 270)",
      "--color-foreground": "oklch(0.9 0.01 270)",
      "--color-card": "oklch(0.18 0.025 270)",
      "--color-primary": "oklch(0.75 0.2 300)",
      "--color-primary-foreground": "oklch(0.15 0.02 270)",
      "--color-secondary": "oklch(0.23 0.025 270)",
      "--color-muted": "oklch(0.23 0.025 270)",
      "--color-muted-foreground": "oklch(0.6 0.02 270)",
      "--color-border": "oklch(0.28 0.025 270)",
      "--color-ring": "oklch(0.75 0.2 300)",
      "--color-lyric-active": "oklch(0.78 0.25 300)",
      "--color-lyric-muted": "oklch(0.5 0.03 270)",
      "--color-lyric-unsung": "oklch(0.5 0.03 270 / 0.7)",
      "--color-surface-card": "oklch(0.18 0.025 270)",
      "--color-surface-muted": "oklch(0.23 0.025 270)",
      "--color-ink-primary": "oklch(0.9 0.01 270)",
      "--color-ink-muted": "oklch(0.6 0.02 270)",
      "--color-border-subtle": "oklch(0.28 0.025 270)",
      "--color-status-success": "oklch(0.75 0.15 155)",
      "--color-status-warning": "oklch(0.8 0.12 75)",
      "--color-status-info": "oklch(0.75 0.12 240)",
      "--color-input": "oklch(0.28 0.025 270)",
    },
  },
  {
    name: "catppuccin-mocha",
    tokens: {
      "--color-background": "oklch(0.17 0.015 280)",
      "--color-foreground": "oklch(0.9 0.01 280)",
      "--color-card": "oklch(0.21 0.02 280)",
      "--color-primary": "oklch(0.7 0.22 330)",
      "--color-primary-foreground": "oklch(0.17 0.015 280)",
      "--color-secondary": "oklch(0.25 0.02 280)",
      "--color-muted": "oklch(0.25 0.02 280)",
      "--color-muted-foreground": "oklch(0.6 0.02 280)",
      "--color-border": "oklch(0.3 0.02 280)",
      "--color-ring": "oklch(0.7 0.22 330)",
      "--color-lyric-active": "oklch(0.73 0.25 330)",
      "--color-lyric-muted": "oklch(0.5 0.03 280)",
      "--color-lyric-unsung": "oklch(0.5 0.03 280 / 0.7)",
      "--color-surface-card": "oklch(0.21 0.02 280)",
      "--color-surface-muted": "oklch(0.25 0.02 280)",
      "--color-ink-primary": "oklch(0.9 0.01 280)",
      "--color-ink-muted": "oklch(0.6 0.02 280)",
      "--color-border-subtle": "oklch(0.3 0.02 280)",
      "--color-status-success": "oklch(0.73 0.15 155)",
      "--color-status-warning": "oklch(0.8 0.13 75)",
      "--color-status-info": "oklch(0.73 0.12 240)",
      "--color-input": "oklch(0.3 0.02 280)",
    },
  },
  {
    name: "dracula",
    tokens: {
      "--color-background": "oklch(0.18 0.02 280)",
      "--color-foreground": "oklch(0.9 0.01 280)",
      "--color-card": "oklch(0.22 0.025 280)",
      "--color-primary": "oklch(0.72 0.25 310)",
      "--color-primary-foreground": "oklch(0.18 0.02 280)",
      "--color-secondary": "oklch(0.26 0.025 280)",
      "--color-muted": "oklch(0.26 0.025 280)",
      "--color-muted-foreground": "oklch(0.62 0.02 280)",
      "--color-border": "oklch(0.32 0.03 280)",
      "--color-ring": "oklch(0.72 0.25 310)",
      "--color-lyric-active": "oklch(0.75 0.28 310)",
      "--color-lyric-muted": "oklch(0.52 0.03 280)",
      "--color-lyric-unsung": "oklch(0.52 0.03 280 / 0.7)",
      "--color-surface-card": "oklch(0.22 0.025 280)",
      "--color-surface-muted": "oklch(0.26 0.025 280)",
      "--color-ink-primary": "oklch(0.9 0.01 280)",
      "--color-ink-muted": "oklch(0.62 0.02 280)",
      "--color-border-subtle": "oklch(0.32 0.03 280)",
      "--color-status-success": "oklch(0.73 0.15 155)",
      "--color-status-warning": "oklch(0.8 0.13 75)",
      "--color-status-info": "oklch(0.73 0.12 240)",
      "--color-input": "oklch(0.32 0.03 280)",
    },
  },
  {
    name: "nord",
    tokens: {
      "--color-background": "oklch(0.17 0.02 240)",
      "--color-foreground": "oklch(0.88 0.02 240)",
      "--color-card": "oklch(0.21 0.025 240)",
      "--color-primary": "oklch(0.68 0.12 240)",
      "--color-primary-foreground": "oklch(0.17 0.02 240)",
      "--color-secondary": "oklch(0.25 0.025 240)",
      "--color-muted": "oklch(0.25 0.025 240)",
      "--color-muted-foreground": "oklch(0.58 0.03 240)",
      "--color-border": "oklch(0.3 0.03 240)",
      "--color-ring": "oklch(0.68 0.12 240)",
      "--color-lyric-active": "oklch(0.72 0.15 240)",
      "--color-lyric-muted": "oklch(0.5 0.03 240)",
      "--color-lyric-unsung": "oklch(0.5 0.03 240 / 0.7)",
      "--color-surface-card": "oklch(0.21 0.025 240)",
      "--color-surface-muted": "oklch(0.25 0.025 240)",
      "--color-ink-primary": "oklch(0.88 0.02 240)",
      "--color-ink-muted": "oklch(0.58 0.03 240)",
      "--color-border-subtle": "oklch(0.3 0.03 240)",
      "--color-status-success": "oklch(0.72 0.15 155)",
      "--color-status-warning": "oklch(0.78 0.12 75)",
      "--color-status-info": "oklch(0.68 0.12 240)",
      "--color-input": "oklch(0.3 0.03 240)",
    },
  },
  {
    name: "gruvbox-dark",
    tokens: {
      "--color-background": "oklch(0.15 0.02 60)",
      "--color-foreground": "oklch(0.88 0.02 60)",
      "--color-card": "oklch(0.19 0.025 60)",
      "--color-primary": "oklch(0.72 0.15 75)",
      "--color-primary-foreground": "oklch(0.15 0.02 60)",
      "--color-secondary": "oklch(0.23 0.025 60)",
      "--color-muted": "oklch(0.23 0.025 60)",
      "--color-muted-foreground": "oklch(0.58 0.03 60)",
      "--color-border": "oklch(0.28 0.03 60)",
      "--color-ring": "oklch(0.72 0.15 75)",
      "--color-lyric-active": "oklch(0.75 0.18 75)",
      "--color-lyric-muted": "oklch(0.5 0.03 60)",
      "--color-lyric-unsung": "oklch(0.5 0.03 60 / 0.7)",
      "--color-surface-card": "oklch(0.19 0.025 60)",
      "--color-surface-muted": "oklch(0.23 0.025 60)",
      "--color-ink-primary": "oklch(0.88 0.02 60)",
      "--color-ink-muted": "oklch(0.58 0.03 60)",
      "--color-border-subtle": "oklch(0.28 0.03 60)",
      "--color-status-success": "oklch(0.72 0.15 155)",
      "--color-status-warning": "oklch(0.78 0.12 75)",
      "--color-status-info": "oklch(0.68 0.12 240)",
      "--color-input": "oklch(0.28 0.03 60)",
    },
  },
];

const THEME_STORAGE_KEY = "umbra-theme";

export function getAvailableThemes(): ThemeToken[] {
  return [defaultTheme, ...THEMES];
}

export function getThemeByName(name: string): ThemeToken {
  return getAvailableThemes().find((t) => t.name === name) ?? defaultTheme;
}

export function getActiveThemeName(): string {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) ?? defaultTheme.name;
  } catch {
    return defaultTheme.name;
  }
}

export function setActiveTheme(name: string) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, name);
  } catch {}
  applyTheme(getThemeByName(name));
}

export function applyTheme(theme: ThemeToken) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(key, value);
  }
}

export function initTheme() {
  applyTheme(getThemeByName(getActiveThemeName()));
}
