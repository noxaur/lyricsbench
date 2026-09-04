import { useEffect, useCallback } from "react";
import { usePlayerStore } from "@/stores/player-store";

export function useKeyboardShortcuts() {
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const seekBy = usePlayerStore((s) => s.seekBy);
  const adjustOffset = usePlayerStore((s) => s.adjustOffset);
  const setFocusMode = usePlayerStore((s) => s.setFocusMode);
  const setTvMode = usePlayerStore((s) => s.setTvMode);
  const setVideoHidden = usePlayerStore((s) => s.setVideoHidden);

  const handler = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) adjustOffset(100);
          else seekBy(5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) adjustOffset(-100);
          else seekBy(-5);
          break;
        case "+":
        case "=":
          e.preventDefault();
          adjustOffset(50);
          break;
        case "-":
        case "_":
          e.preventDefault();
          adjustOffset(-50);
          break;
        case "f":
        case "F":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setFocusMode(!usePlayerStore.getState().focusMode);
          }
          break;
        case "t":
        case "T":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setTvMode(!usePlayerStore.getState().tvMode);
          }
          break;
        case "h":
        case "H":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setVideoHidden(!usePlayerStore.getState().videoHidden);
          }
          break;
      }
    },
    [togglePlay, seekBy, adjustOffset, setFocusMode, setTvMode, setVideoHidden],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
