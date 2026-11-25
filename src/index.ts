export {
  tanglishToTamil,
  transliterateWord,
  transliterateWordPhonetic,
  type TransliterateOptions,
} from './transliterate.js';
export { tamilToTanglish, type RomanizeOptions, type RomanStyle } from './romanize.js';
export {
  tagWords,
  detectLanguage,
  detectWordLanguage,
  scoreWord,
  type WordTag,
  type WordLang,
  type TagOptions,
  type LanguageSummary,
} from './langid/index.js';
export { trainNaiveBayes, charNgrams, logOdds, type NaiveBayesModel } from './langid/features.js';
export {
  splitLetters,
  countTamilLetters,
  analyzeLetter,
  analyzeText,
  type LetterInfo,
  type LetterType,
  type TextStats,
} from './letters.js';
export { LEXICON } from './lexicon.js';
export {
  normalizeTamil,
  toTamilNumerals,
  fromTamilNumerals,
  isTamilChar,
  VOWELS,
  CONSONANTS,
  GRANTHA,
} from './tamil.js';
