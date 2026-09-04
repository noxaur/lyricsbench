export type TranslationBackend = "google" | "mymemory" | "chrome" | null;

type TranslateOptions = {
  lines: string[];
  from?: string;
  to?: string;
  backend?: TranslationBackend;
  signal?: AbortSignal;
};

async function translateGoogle(lines: string[], from: string, to: string, signal?: AbortSignal): Promise<string[]> {
  const text = lines.join("\n");
  const res = await fetch("/api/translate/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, from, to }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { translatedText: string };
  return data.translatedText.split("\n");
}

async function translateMyMemory(lines: string[], from: string, to: string, signal?: AbortSignal): Promise<string[]> {
  const results: string[] = [];
  for (const line of lines) {
    if (!line.trim()) { results.push(""); continue; }
    try {
      const params = new URLSearchParams({
        q: line,
        langpair: `${from}|${to}`,
      });
      const res = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal });
      if (!res.ok) throw new Error("failed");
      const data = await res.json() as { responseData: { translatedText: string } };
      results.push(data.responseData.translatedText ?? line);
    } catch {
      results.push(line);
    }
  }
  return results;
}

async function translateChrome(lines: string[], to: string): Promise<string[]> {
  if (!("chrome" in window) || !(window as Record<string, unknown>).chrome) {
    throw new Error("Chrome Translator API not available");
  }
  const translator = await (window as Record<string, unknown>).chrome as { translate: (text: string, opts: { from: string; to: string }) => Promise<string> };
  const text = lines.join("\n");
  const result = await translator.translate(text, { from: "auto", to });
  return result.split("\n");
}

export async function translateLines(options: TranslateOptions): Promise<{ lines: string[]; backend: TranslationBackend }> {
  const { lines, from = "auto", to = "en", signal } = options;
  const backend = options.backend;

  // Try Chrome first if available
  if (!backend || backend === "chrome") {
    try {
      const result = await translateChrome(lines, to);
      return { lines: result, backend: "chrome" };
    } catch {}
  }

  // Try Google Translate proxy
  if (!backend || backend === "google") {
    try {
      const result = await translateGoogle(lines, from, to, signal);
      return { lines: result, backend: "google" };
    } catch {}
  }

  // Try MyMemory
  if (!backend || backend === "mymemory") {
    try {
      const result = await translateMyMemory(lines, from, to, signal);
      return { lines: result, backend: "mymemory" };
    } catch {}
  }

  return { lines, backend: null };
}
