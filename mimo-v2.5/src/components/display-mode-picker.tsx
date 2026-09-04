import { cn } from "@/lib/utils";
import { usePlayerStore } from "@/stores/player-store";
import type { LyricDisplayMode } from "@/types/lyrics";

const MODES: { value: LyricDisplayMode; label: string }[] = [
  { value: "native", label: "Native" },
  { value: "english", label: "English" },
  { value: "both", label: "Both" },
  { value: "romaji", label: "Romaji" },
  { value: "all", label: "All" },
];

export function DisplayModePicker() {
  const displayMode = usePlayerStore((s) => s.displayMode);
  const setDisplayMode = usePlayerStore((s) => s.setDisplayMode);

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface-muted/30 p-0.5">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => setDisplayMode(mode.value)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            displayMode === mode.value
              ? "bg-secondary text-foreground"
              : "text-ink-muted hover:text-foreground",
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
