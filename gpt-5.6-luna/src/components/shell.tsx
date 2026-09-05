import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { Icon } from "./icon";
import { useTheme } from "../lib/theme";

function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="Umbra home">
      <span className="brand__glyph" aria-hidden="true"><i /></span>
      <span>umbra</span>
    </NavLink>
  );
}

function ThemeCycleButton() {
  const { theme, cycleTheme } = useTheme();
  const light = theme === "dawn";
  return (
    <button
      className="icon-button shell__theme"
      type="button"
      onClick={cycleTheme}
      title="Change room theme"
      aria-label="Change room theme"
    >
      <Icon name={light ? "sun" : "moon"} size={18} />
    </button>
  );
}

export function Shell({ children, player = false }: { children: ReactNode; player?: boolean }) {
  return (
    <div className={`app-shell${player ? " app-shell--player" : ""}`}>
      <header className="shell-header">
        <Brand />
        <nav className="shell-nav" aria-label="Primary navigation">
          <NavLink to="/playlists" className={({ isActive }) => `shell-nav__link${isActive ? " is-active" : ""}`}>
            Library
          </NavLink>
          <NavLink to="/themes" className={({ isActive }) => `shell-nav__link${isActive ? " is-active" : ""}`}>
            Rooms
          </NavLink>
        </nav>
        <div className="shell-actions">
          <span className="shell-status"><span /> Synced lyrics</span>
          <ThemeCycleButton />
        </div>
      </header>
      {children}
    </div>
  );
}
