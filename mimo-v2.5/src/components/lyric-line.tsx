import { useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LyricLine as LyricLineType } from "@/types/lyrics";

type LyricLineProps = {
  line: LyricLineType;
  isActive: boolean;
  wordProgress: number;
  displayText: string;
  onClick?: () => void;
  showTimestamp?: boolean;
  index: number;
};

function formatTimestamp(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LyricLine({
  line,
  isActive,
  wordProgress,
  displayText,
  onClick,
  showTimestamp,
  index,
}: LyricLineProps) {
  const progressPct = isActive ? wordProgress * 100 : 0;

  const clipStyle = useMemo(
    () => ({
      clipPath: isActive ? `inset(0 ${100 - progressPct}% 0 0)` : undefined,
    }),
    [isActive, progressPct],
  );

  if (line.kind === "section") {
    return (
      <div className="py-3 text-center">
        {line.sectionLabel && (
          <span className="inline-block rounded-full bg-surface-muted px-3 py-1 text-xs font-medium tracking-wide text-ink-muted">
            {line.sectionLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      data-line-index={index}
      className={cn(
        "group relative w-full cursor-pointer py-2 px-4 text-left transition-colors rounded-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "z-10"
          : "hover:bg-surface-muted/30",
      )}
      animate={{
        scale: isActive ? 1 : 0.95,
        opacity: isActive ? 1 : 0.4,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {showTimestamp && (
        <span className="absolute -left-1 top-1 text-[10px] text-ink-muted/50 opacity-0 transition-opacity group-hover:opacity-100">
          {formatTimestamp(line.startMs)}
        </span>
      )}

      {/* Background layer (unsung text) */}
      <span
        className={cn(
          "block select-none whitespace-pre-wrap break-words",
          isActive
            ? "text-[clamp(2rem,5vw,5rem)] font-semibold leading-tight text-lyric-unsung"
            : "text-[clamp(0.9rem,2.5vw,1.5rem)] font-semibold leading-snug text-lyric-muted",
        )}
      >
        {displayText}
      </span>

      {/* Foreground layer (sung text) with clip-path reveal */}
      {isActive && (
        <span
          className="absolute inset-0 flex items-center px-4 text-[clamp(2rem,5vw,5rem)] font-semibold leading-tight text-lyric-active"
          style={clipStyle}
          aria-hidden="true"
        >
          {displayText}
        </span>
      )}
    </motion.button>
  );
}
