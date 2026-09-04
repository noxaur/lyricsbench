const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/
const HANGUL_RE = /[\uac00-\ud7af]/
const KANA_RE = /[\u3040-\u30ff]/
const CYRILLIC_RE = /[\u0400-\u04ff]/

export function detectLanguage(sample: string): string {
  const text = sample.slice(0, 1200)
  if (HANGUL_RE.test(text)) return "ko"
  if (KANA_RE.test(text)) return "ja"
  if (CJK_RE.test(text)) return "zh"
  if (CYRILLIC_RE.test(text)) return "ru"
  return "en"
}

export function looksEnglish(sample: string): boolean {
  const letters = sample.replace(/[^\p{L}]/gu, "")
  if (letters.length < 12) return detectLanguage(sample) === "en"
  const ascii = letters.replace(/[^A-Za-z]/g, "").length
  return ascii / letters.length > 0.85 && !CJK_RE.test(sample)
}
