import { cn } from "@/lib/utils";

type YouTubeEmbedProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  hidden?: boolean;
};

export function YouTubeEmbed({ containerRef, hidden }: YouTubeEmbedProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-black",
        hidden ? "h-0 w-0 opacity-0" : "aspect-video",
      )}
      style={hidden ? { position: "absolute", pointerEvents: "none" } : undefined}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
