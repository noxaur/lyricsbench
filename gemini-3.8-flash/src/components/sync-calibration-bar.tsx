import React from "react"
import { Sliders, RotateCcw, Check } from "lucide-react"

type SyncCalibrationBarProps = {
  offsetMs: number
  onChangeOffset: (offset: number) => void
  onReset: () => void
  isStored: boolean
}

export function SyncCalibrationBar({
  offsetMs,
  onChangeOffset,
  onReset,
  isStored,
}: SyncCalibrationBarProps) {
  const steps = [-500, -100, 100, 500]

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-3 bg-card/90 border border-border/70 rounded-2xl backdrop-blur-md shadow-lg flex flex-col gap-2.5 animate-in fade-in duration-200">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span>Timing Sync Calibration</span>
          {isStored && (
            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-success/15 text-success font-normal">
              <Check className="w-3 h-3" /> Saved for track
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted/60 text-primary">
            {offsetMs > 0 ? `+${offsetMs}ms` : `${offsetMs}ms`}
          </span>
          {offsetMs !== 0 && (
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              title="Reset offset to 0ms"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min={-5000}
          max={5000}
          step={50}
          value={offsetMs}
          onChange={(e) => onChangeOffset(parseInt(e.target.value, 10))}
          className="flex-1 accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
        <div className="flex items-center gap-1.5">
          {steps.map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => onChangeOffset(offsetMs + step)}
              className="px-2 py-1 rounded bg-secondary/70 hover:bg-secondary text-secondary-foreground text-[11px] font-mono transition-colors"
            >
              {step > 0 ? `+${step}ms` : `${step}ms`}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground/70 hidden sm:inline">
          Shortcuts: <kbd className="px-1 py-0.5 rounded bg-muted/60 text-[10px] font-mono">[</kbd> / <kbd className="px-1 py-0.5 rounded bg-muted/60 text-[10px] font-mono">]</kbd> (±100ms)
        </span>
      </div>
    </div>
  )
}
