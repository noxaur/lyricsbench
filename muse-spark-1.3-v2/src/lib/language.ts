/**
 * Language routing: assume lyrics are in the language they're written in.
 * Only non-English lyrics trigger the English-counterpart offer; English
 * lyrics never do. Dependency-free script + stopword heuristic.
 */

export type ScriptGuess = "latin" | "cjk" | "cyrillic" | "other" | "empty";

export function dominantScript(text: string): ScriptGuess {
  let latin = 0;
  let cjk = 0;
  let cyrillic = 0;
  let other = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (/\s/.test(ch) || /\p{P}/u.test(ch) || /\p{N}/u.test(ch)) continue;
    if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a) || (cp >= 0xc0 && cp <= 0x2af)) {
      latin++;
    } else if (
      (cp >= 0x3040 && cp <= 0x30ff) ||
      (cp >= 0x4e00 && cp <= 0x9fff) ||
      (cp >= 0xac00 && cp <= 0xd7af)
    ) {
      cjk++;
    } else if (cp >= 0x400 && cp <= 0x4ff) {
      cyrillic++;
    } else {
      other++;
    }
  }
  const total = latin + cjk + cyrillic + other;
  if (total === 0) return "empty";
  if (cjk / total > 0.15) return "cjk";
  if (cyrillic / total > 0.4) return "cyrillic";
  if (latin / total > 0.6) return "latin";
  return "other";
}

const EN_STOPWORDS = new Set(
  "the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were has had been will would there here".split(
    " ",
  ),
);

/** True when latin-script text looks like English (stopword density). */
export function looksEnglish(text: string): boolean {
  if (dominantScript(text) !== "latin") return false;
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 4) return false;
  let hits = 0;
  for (const w of words) if (EN_STOPWORDS.has(w)) hits++;
  return hits / words.length > 0.08 && hits >= 2;
}

/** Should the player badge these lyrics as non-English? */
export function needsEnglishCounterpart(sampleText: string): boolean {
  const script = dominantScript(sampleText);
  if (script === "empty") return false;
  if (script === "latin") return !looksEnglish(sampleText);
  return true;
}
