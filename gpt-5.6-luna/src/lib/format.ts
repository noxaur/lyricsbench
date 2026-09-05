export function formatTime(value: number): string {
  const seconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function displayTitle(title: string): string {
  return title.length > 48 ? `${title.slice(0, 46)}…` : title;
}

export function slugFromInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "midnight-amethyst";

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get("v");
    const fromPath = url.hostname.includes("youtu.be")
      ? url.pathname.split("/").filter(Boolean)[0]
      : undefined;
    const raw = fromQuery || fromPath || url.pathname.split("/").filter(Boolean).pop();
    if (raw) return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60) || "midnight-amethyst";
  } catch {
    // A plain song title is a valid starting point too.
  }

  return (
    trimmed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "midnight-amethyst"
  );
}
