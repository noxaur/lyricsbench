const CJK_HIRAGANA_KATAKANA_KANJI = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
const HANGUL_REGEX = /[\uac00-\ud7af\u1100-\u11ff]/
const CYRILLIC_REGEX = /[\u0400-\u04ff]/

const COMMON_ENGLISH_WORDS = new Set([
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "i", "it", "for", "not", "on", "with",
  "he", "as", "you", "do", "at", "this", "but", "his", "by", "from", "they", "we", "say", "her",
  "she", "or", "an", "will", "my", "one", "all", "would", "there", "their", "what", "so", "up",
  "out", "if", "about", "who", "get", "which", "go", "me", "when", "make", "can", "like", "time",
  "no", "just", "him", "know", "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", "think",
  "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", "way", "even",
  "new", "want", "because", "any", "these", "give", "day", "most", "us", "love", "baby", "heart",
  "night", "never", "forever", "feel", "tonight", "girl", "boy", "yeah", "ooh", "gonna", "wanna",
  "dont", "don't", "cant", "can't", "wont", "won't", "ill", "i'll", "youre", "you're", "away"
])

export type DetectedScript = "english" | "japanese" | "korean" | "cyrillic" | "other-latin" | "unknown"

export function detectScriptAndLanguage(text: string): {
  script: DetectedScript
  isEnglish: boolean
  hasCjk: boolean
  hasHangul: boolean
  hasCyrillic: boolean
  englishConfidence: number
} {
  if (!text || !text.trim()) {
    return {
      script: "unknown",
      isEnglish: true,
      hasCjk: false,
      hasHangul: false,
      hasCyrillic: false,
      englishConfidence: 1,
    }
  }

  const sample = text.slice(0, 2000)
  const hasCjk = CJK_HIRAGANA_KATAKANA_KANJI.test(sample)
  const hasHangul = HANGUL_REGEX.test(sample)
  const hasCyrillic = CYRILLIC_REGEX.test(sample)

  if (hasCjk) {
    return {
      script: "japanese",
      isEnglish: false,
      hasCjk: true,
      hasHangul,
      hasCyrillic,
      englishConfidence: 0,
    }
  }

  if (hasHangul) {
    return {
      script: "korean",
      isEnglish: false,
      hasCjk: false,
      hasHangul: true,
      hasCyrillic,
      englishConfidence: 0,
    }
  }

  if (hasCyrillic) {
    return {
      script: "cyrillic",
      isEnglish: false,
      hasCjk: false,
      hasHangul: false,
      hasCyrillic: true,
      englishConfidence: 0,
    }
  }

  // Check latin word matching for English vs other Latin languages (Spanish, French, etc.)
  const words = sample
    .toLowerCase()
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)

  if (words.length === 0) {
    return {
      script: "english",
      isEnglish: true,
      hasCjk: false,
      hasHangul: false,
      hasCyrillic: false,
      englishConfidence: 0.8,
    }
  }

  let englishWordMatches = 0
  for (const word of words) {
    if (COMMON_ENGLISH_WORDS.has(word)) {
      englishWordMatches++
    }
  }

  const ratio = englishWordMatches / words.length
  const isEnglish = ratio >= 0.15 || words.length < 5

  return {
    script: isEnglish ? "english" : "other-latin",
    isEnglish,
    hasCjk: false,
    hasHangul: false,
    hasCyrillic: false,
    englishConfidence: ratio,
  }
}
