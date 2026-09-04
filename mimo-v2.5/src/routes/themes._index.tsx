import { useState, useCallback } from "react";
import { Link } from "react-router";
import { ArrowLeft, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAvailableThemes,
  getActiveThemeName,
  setActiveTheme,
  applyTheme,
  type ThemeToken,
} from "@/lib/themes";

export default function ThemesPage() {
  const themes = getAvailableThemes();
  const [activeTheme, setActiveThemeState] = useState(getActiveThemeName());

  const handleSelect = useCallback((theme: ThemeToken) => {
    setActiveTheme(theme.name);
    setActiveThemeState(theme.name);
  }, []);

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          to="/"
          className="mb-4 flex items-center gap-1.5 text-xs text-ink-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>

        <h1 className="text-xl font-bold text-ink-primary">Themes</h1>
        <p className="mt-1 text-sm text-ink-muted">Choose a color palette for the player.</p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {themes.map((theme) => {
            const isActive = activeTheme === theme.name;
            const bgColor = theme.tokens["--color-background"] ?? "oklch(0.1 0.025 280)";
            const primaryColor = theme.tokens["--color-primary"] ?? "oklch(0.72 0.28 320)";
            const fgColor = theme.tokens["--color-foreground"] ?? "oklch(0.95 0.01 280)";

            return (
              <button
                key={theme.name}
                type="button"
                onClick={() => handleSelect(theme)}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                  isActive
                    ? "border-primary"
                    : "border-transparent hover:border-border",
                )}
                style={{ backgroundColor: bgColor }}
              >
                {isActive && (
                  <div className="absolute right-2 top-2 rounded-full bg-primary p-0.5">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                <div className="flex gap-1">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: fgColor }} />
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.tokens["--color-muted"] ?? "#333" }} />
                </div>
                <span
                  className="text-xs font-medium capitalize"
                  style={{ color: fgColor }}
                >
                  {theme.name.replace(/-/g, " ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
