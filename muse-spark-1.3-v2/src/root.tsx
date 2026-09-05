import { useCallback, useEffect, useState } from "react";
import { Link, Outlet } from "react-router";
import { readPrefs, writePrefs } from "@/lib/store";

const THEME_KEY = "umbra.v2.theme";

/**
 * App shell: top bar + outlet. Theme is a data-attribute on <html> plus a
 * prefs record (video/timestamps live in the same store namespace).
 */
export function Root() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch {
      // ignore
    }
    return "dark";
  });

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

  // Touch the prefs store so first-visit defaults are materialised early.
  useEffect(() => {
    writePrefs(readPrefs());
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          umbra<span>.</span>
          <span className="brand-v2">v2</span>
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
