import React from "react"
import { Keyboard, X } from "lucide-react"

type KeyboardShortcutsDialogProps = {
  isOpen: boolean
  onClose: () => void
}

const SHORTCUTS = [
  { key: "Space", description: "Play / Pause" },
  { key: "← / →", description: "Seek backward / forward 5 seconds" },
  { key: "[ / ]", description: "Adjust sync offset by ±100ms" },
  { key: "{ / }", description: "Adjust sync offset by ±500ms" },
  { key: "V", description: "Toggle YouTube video visibility" },
  { key: "M", description: "Mute / Unmute audio" },
  { key: "F", description: "Toggle fullscreen stage" },
  { key: "1 / 2 / 3 / 4", description: "Switch lyrics mode (Native, Romaji, English, Both)" },
  { key: "?", description: "Toggle keyboard shortcuts sheet" },
  { key: "Esc", description: "Close modal / return to stage" },
]

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
}: KeyboardShortcutsDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2 text-primary">
            <Keyboard className="w-5 h-5" />
            <h3 className="text-base font-semibold text-foreground">Keyboard Shortcuts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-2.5 text-xs">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-1 rounded bg-muted border border-border/60 font-mono text-[11px] font-semibold text-foreground">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
