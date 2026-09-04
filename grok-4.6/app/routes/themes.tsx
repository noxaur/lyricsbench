import { useEffect, useState } from "react"
import { DEFAULT_THEME, isThemeId, themes, type ThemeId } from "~/lib/themes"
import { getThemeId, setThemeId } from "~/lib/storage"
import { cn } from "~/lib/cn"

export function meta() {
  return [{ title: "Themes · umbra" }]
}

function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id
  setThemeId(id)
}

export default function ThemesPage() {
  const [current, setCurrent] = useState<ThemeId>(DEFAULT_THEME)

  useEffect(() => {
    const stored = getThemeId()
    if (isThemeId(stored)) {
      setCurrent(stored)
      applyTheme(stored)
    }
  }, [])

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
      <h1 className="font-lyric text-4xl">Themes</h1>
      <p className="mt-2 max-w-md text-dim">Four booths. The lyric color is the only accent.</p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {themes.map((theme) => (
          <li key={theme.id}>
            <button
              type="button"
              onClick={() => {
                setCurrent(theme.id)
                applyTheme(theme.id)
              }}
              className={cn(
                "w-full rounded-[12px] border p-4 text-left",
                current === theme.id ? "border-ember" : "border-line",
              )}
            >
              <span className="font-lyric text-2xl">{theme.name}</span>
              <span className="mt-1 block text-sm text-dim">{theme.group}</span>
              <span className="mt-6 block font-lyric text-2xl">
                <span className="text-sung">When the night</span> <span className="text-unsung">is in the way</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  )
}
