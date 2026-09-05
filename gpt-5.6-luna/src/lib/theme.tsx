import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeName = "violet" | "dawn" | "fog";

export const themeOptions: Array<{ name: ThemeName; label: string; description: string }> = [
  { name: "violet", label: "Violet room", description: "The original lights-down stage." },
  { name: "dawn", label: "Dawn room", description: "A quiet, high-contrast light theme." },
  { name: "fog", label: "Blue room", description: "Cool, low-saturation night air." },
];

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  cycleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const storageKey = "umbra-room-theme";

function readTheme(): ThemeName {
  if (typeof window === "undefined") return "violet";
  const saved = window.localStorage.getItem(storageKey);
  return themeOptions.some((option) => option.name === saved) ? (saved as ThemeName) : "violet";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      cycleTheme: () => {
        const index = themeOptions.findIndex((option) => option.name === theme);
        setTheme(themeOptions[(index + 1) % themeOptions.length].name);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
