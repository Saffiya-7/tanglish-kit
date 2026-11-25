import {
  AYTHAM,
  PULLI,
  SHORT_VOWELS,
  SIGN_VOWEL,
  consonantGroup,
  isConsonant,
  isVowel,
  normalizeTamil,
  type ConsonantGroup,
} from './tamil.js';

/**
 * One Tamil letter (எழுத்து) is: a vowel, a consonant with pulli, a consonant
 * with an optional vowel sign, ஃ, or the special ligatures க்ஷ / ஸ்ரீ.
 * JavaScript's `.length` counts code points, so "தமிழ்".length === 5 even though
 * a reader sees 3 letters. This splitter fixes that.
 */
const LETTER_RE =
  /ஸ்ரீ|க்ஷ[ா-்ௗ]?|[க-ஹ][ா-்ௗ]?|[அ-ஔ]|ஃ|[\s\S]/gu;

/** Split text into user-perceived letters (Tamil-aware; other characters pass through one by one). */
export function splitLetters(text: string): string[] {
  return normalizeTamil(text).match(LETTER_RE) ?? [];
}

/** Count Tamil letters only (ignores spaces, punctuation and Latin text). */
export function countTamilLetters(text: string): number {
  return splitLetters(text).filter((l) => analyzeLetter(l).type !== 'other').length;
}

export type LetterType = 'uyir' | 'mei' | 'uyirmei' | 'aytham' | 'other';

export interface LetterInfo {
  letter: string;
  /** uyir = vowel, mei = consonant with pulli, uyirmei = consonant + vowel, aytham = ஃ */
  type: LetterType;
  /** The consonant written with pulli, e.g. "க்" for கா */
  mei?: string;
  /** The vowel, e.g. "ஆ" for கா */
  uyir?: string;
  /** Short (kuril) or long (nedil) — only for letters that carry a vowel */
  length?: 'kuril' | 'nedil';
  /** vallinam / mellinam / idaiyinam / grantha — only for letters with a consonant */
  group?: ConsonantGroup;
  grantha: boolean;
}

export function analyzeLetter(letter: string): LetterInfo {
  if (letter === AYTHAM) return { letter, type: 'aytham', grantha: false };

  if (isVowel(letter)) {
    return {
      letter,
      type: 'uyir',
      uyir: letter,
      length: SHORT_VOWELS.has(letter) ? 'kuril' : 'nedil',
      grantha: false,
    };
  }

  if (letter === 'ஸ்ரீ') {
    return { letter, type: 'uyirmei', mei: 'ஸ்', uyir: 'ஈ', length: 'nedil', group: 'grantha', grantha: true };
  }

  const chars = Array.from(letter);
  if (!isConsonant(chars[0])) return { letter, type: 'other', grantha: false };

  const isKsha = chars[1] === PULLI && chars[2] === 'ஷ';
  const base = isKsha ? 'க்ஷ' : chars[0];
  const tail = chars[isKsha ? 3 : 1];
  const group = consonantGroup(base);
  const grantha = group === 'grantha';
  const mei = base + PULLI;

  if (tail === PULLI) return { letter, type: 'mei', mei, group, grantha };

  const uyir = tail !== undefined ? SIGN_VOWEL[tail] ?? 'அ' : 'அ';
  return {
    letter,
    type: 'uyirmei',
    mei,
    uyir,
    length: SHORT_VOWELS.has(uyir) ? 'kuril' : 'nedil',
    group,
    grantha,
  };
}

export interface TextStats {
  letters: number;
  uyir: number;
  mei: number;
  uyirmei: number;
  aytham: number;
  kuril: number;
  nedil: number;
  vallinam: number;
  mellinam: number;
  idaiyinam: number;
  grantha: number;
  /** Code-point length (what `.length`-based limits see). */
  codePoints: number;
}

/** Letter-level statistics for Tamil text. */
export function analyzeText(text: string): TextStats {
  const stats: TextStats = {
    letters: 0, uyir: 0, mei: 0, uyirmei: 0, aytham: 0, kuril: 0, nedil: 0,
    vallinam: 0, mellinam: 0, idaiyinam: 0, grantha: 0, codePoints: Array.from(text).length,
  };
  for (const letter of splitLetters(text)) {
    const info = analyzeLetter(letter);
    if (info.type === 'other') continue;
    stats.letters++;
    stats[info.type]++;
    if (info.length) stats[info.length]++;
    if (info.group) stats[info.group]++;
  }
  return stats;
}
