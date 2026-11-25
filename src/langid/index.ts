import { lookupLexicon } from '../lexicon.js';
import { isTamilChar } from '../tamil.js';
import { logOdds, type NaiveBayesModel } from './features.js';
import { MODEL } from './model.js';

export type WordLang = 'tamil' | 'tanglish' | 'en' | 'other';

export interface WordTag {
  word: string;
  /** Start offset in the original string (UTF-16 index). */
  start: number;
  end: number;
  lang: WordLang;
  /** Probability of the chosen label, 0.5 – 1. Script-based tags are 1. */
  confidence: number;
}

export interface TagOptions {
  /**
   * How much neighbouring words influence an uncertain word (0 = none).
   * Code-mixed sentences switch language in runs, so "po" next to Tamil words
   * is probably Tamil. Default: 0.35.
   */
  context?: number;
  /** Override the bundled model (e.g. one you trained on your own data). */
  model?: NaiveBayesModel;
}

const TOKEN_RE = /[A-Za-z]+|[஀-௿‌‍]+|[0-9]+|[^\sA-Za-z0-9஀-௿]+/g;
const LEXICON_SCORE = 6;

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** Score a single Latin word: log-odds of Tanglish vs English (positive → Tanglish). */
export function scoreWord(word: string, model: NaiveBayesModel = MODEL): number {
  if (lookupLexicon(word.toLowerCase())) return LEXICON_SCORE;
  return logOdds(model, word);
}

/** Classify a single Latin word as Tanglish or English. */
export function detectWordLanguage(word: string, model: NaiveBayesModel = MODEL): { lang: 'tanglish' | 'en'; confidence: number } {
  const p = sigmoid(scoreWord(word, model));
  return p >= 0.5 ? { lang: 'tanglish', confidence: p } : { lang: 'en', confidence: 1 - p };
}

/**
 * Tag every word in a (possibly code-mixed) sentence.
 *
 * @example
 * tagWords('machan meeting cancel aachu')
 * // machan → tanglish, meeting → en, cancel → en, aachu → tanglish
 */
export function tagWords(text: string, options: TagOptions = {}): WordTag[] {
  const model = options.model ?? MODEL;
  const lambda = options.context ?? 0.35;
  const tags: WordTag[] = [];
  const latin: { tag: WordTag; own: number }[] = [];

  for (const m of text.matchAll(TOKEN_RE)) {
    const word = m[0];
    const start = m.index ?? 0;
    const tag: WordTag = { word, start, end: start + word.length, lang: 'other', confidence: 1 };
    if (/^[A-Za-z]+$/.test(word)) {
      latin.push({ tag, own: scoreWord(word, model) });
    } else if (isTamilChar(word[0])) {
      tag.lang = 'tamil';
    }
    tags.push(tag);
  }

  // Context smoothing: blend each word's own score with its neighbours' (±2 Latin words).
  // Squash neighbour scores so one very long word can't overpower the sentence.
  for (let i = 0; i < latin.length; i++) {
    let neighbourSum = 0;
    let n = 0;
    for (let j = i - 2; j <= i + 2; j++) {
      if (j === i || j < 0 || j >= latin.length) continue;
      neighbourSum += Math.tanh(latin[j].own / 4) * 4;
      n++;
    }
    const score = latin[i].own + (n ? (lambda * neighbourSum) / n : 0);
    const p = sigmoid(score);
    latin[i].tag.lang = p >= 0.5 ? 'tanglish' : 'en';
    latin[i].tag.confidence = p >= 0.5 ? p : 1 - p;
  }

  return tags;
}

export interface LanguageSummary {
  /** Fraction of words in each language (punctuation/numbers excluded). */
  tamil: number;
  tanglish: number;
  en: number;
  dominant: 'tamil' | 'tanglish' | 'en' | 'none';
  /** True when at least two languages each make up ≥ 15% of the words. */
  codeMixed: boolean;
}

/** Summarize which languages a text is written in. */
export function detectLanguage(text: string, options: TagOptions = {}): LanguageSummary {
  const words = tagWords(text, options).filter((t) => t.lang !== 'other');
  const total = words.length;
  const share = (lang: WordLang) => (total ? words.filter((t) => t.lang === lang).length / total : 0);
  const tamil = share('tamil');
  const tanglish = share('tanglish');
  const en = share('en');
  const ranked = (
    [
      ['tamil', tamil],
      ['tanglish', tanglish],
      ['en', en],
    ] as const
  )
    .slice()
    .sort((a, b) => b[1] - a[1]);
  return {
    tamil,
    tanglish,
    en,
    dominant: total ? ranked[0][0] : 'none',
    codeMixed: [tamil, tanglish, en].filter((x) => x >= 0.15).length >= 2,
  };
}
