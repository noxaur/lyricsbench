import { useCallback, useEffect, useState } from "react";
import { Link, Outlet } from "react-router";

const THEME_KEY = "umbra.theme.v1";

function initialTheme(): "dark" | "light" {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // ignore
  }
  return "dark";
}

/**
 * App shell: top bar + outlet. Theme is a single data-attribute on
 * <html> — no context provider, no 20-preset theme store. The old
 * themes.ts + generated-tinted-themes.ts + custom-themes.ts + theme
 * builder page were product chrome around a karaoke player; the fresh
 * build keeps dark-first + light, which is what the player needs.
 */
export function Root() {
  const [theme, setTheme] = useState<"dark" | "light">(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          umbra<span>.</span>
        </Link>
        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? "☾ dark" : "☀ light"}
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
