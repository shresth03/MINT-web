// Maps Unicode script ranges to BCP-47 language codes.
// Scans the first 200 characters — enough for script fingerprinting.
// Order matters: more common/specific ranges are checked first.
const SCRIPTS = [
  [/[ऀ-ॿ]/, 'hi'],  // Devanagari → Hindi (also Marathi, Nepali)
  [/[ঀ-৿]/, 'bn'],  // Bengali (also Assamese)
  [/[਀-੿]/, 'pa'],  // Gurmukhi → Punjabi
  [/[઀-૿]/, 'gu'],  // Gujarati
  [/[଀-୿]/, 'or'],  // Odia
  [/[஀-௿]/, 'ta'],  // Tamil
  [/[ఀ-౿]/, 'te'],  // Telugu
  [/[ಀ-೿]/, 'kn'],  // Kannada
  [/[ഀ-ൿ]/, 'ml'],  // Malayalam
  [/[؀-ۿ]/, 'ur'],  // Arabic script → Urdu
  [/[぀-ヿ]/, 'ja'],  // Hiragana/Katakana → Japanese (checked before CJK: Kana uniquely identifies ja)
  [/[一-鿿]/, 'zh'],  // CJK → Chinese
  [/[가-힣]/, 'ko'],  // Hangul → Korean
  [/[Ѐ-ӿ]/, 'ru'],  // Cyrillic → Russian
  [/[฀-๿]/, 'th'],  // Thai
]

export function detect(text) {
  if (!text) return 'en'
  const sample = text.slice(0, 200)
  for (const [re, lang] of SCRIPTS) {
    if (re.test(sample)) return lang
  }
  return 'en' // Latin / ASCII / unknown → assume English
}
