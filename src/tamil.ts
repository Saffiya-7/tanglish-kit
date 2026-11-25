/**
 * Core Tamil script tables shared by every module.
 * Unicode block: U+0B80 – U+0BFF.
 */

export const PULLI = '்'; // ்
export const AYTHAM = 'ஃ'; // ஃ

/** Independent vowels (உயிர் எழுத்துகள்) in traditional order. */
export const VOWELS = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'] as const;

/** Short vowels (குறில்). Every other vowel is long (நெடில்). */
export const SHORT_VOWELS = new Set(['அ', 'இ', 'உ', 'எ', 'ஒ']);

/** Vowel → dependent vowel sign used after a consonant. அ has no sign (inherent). */
export const VOWEL_SIGN: Record<string, string> = {
  'அ': '',
  'ஆ': 'ா',
  'இ': 'ி',
  'ஈ': 'ீ',
  'உ': 'ு',
  'ஊ': 'ூ',
  'எ': 'ெ',
  'ஏ': 'ே',
  'ஐ': 'ை',
  'ஒ': 'ொ',
  'ஓ': 'ோ',
  'ஔ': 'ௌ',
};

/** Dependent vowel sign → its independent vowel. */
export const SIGN_VOWEL: Record<string, string> = Object.fromEntries(
  Object.entries(VOWEL_SIGN)
    .filter(([, sign]) => sign !== '')
    .map(([vowel, sign]) => [sign, vowel]),
);

/** The 18 native consonants (மெய் எழுத்துகள்), grouped. */
export const VALLINAM = ['க', 'ச', 'ட', 'த', 'ப', 'ற'] as const; // hard
export const MELLINAM = ['ங', 'ஞ', 'ண', 'ந', 'ம', 'ன'] as const; // soft
export const IDAIYINAM = ['ய', 'ர', 'ல', 'வ', 'ழ', 'ள'] as const; // medium
export const CONSONANTS = [
  'க', 'ங', 'ச', 'ஞ', 'ட', 'ண', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள', 'ற', 'ன',
] as const;

/** Grantha consonants borrowed for Sanskrit / foreign sounds. */
export const GRANTHA = ['ஜ', 'ஶ', 'ஷ', 'ஸ', 'ஹ'] as const;

export type ConsonantGroup = 'vallinam' | 'mellinam' | 'idaiyinam' | 'grantha';

export function consonantGroup(consonant: string): ConsonantGroup | undefined {
  if ((VALLINAM as readonly string[]).includes(consonant)) return 'vallinam';
  if ((MELLINAM as readonly string[]).includes(consonant)) return 'mellinam';
  if ((IDAIYINAM as readonly string[]).includes(consonant)) return 'idaiyinam';
  if ((GRANTHA as readonly string[]).includes(consonant) || consonant === 'க்ஷ') return 'grantha';
  return undefined;
}

export const TAMIL_DIGITS = ['௦', '௧', '௨', '௩', '௪', '௫', '௬', '௭', '௮', '௯'] as const;

const ZERO_WIDTH = /[​-‍﻿]/g;

export function isTamilChar(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x0b80 && code <= 0x0bff;
}

export function isConsonant(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x0b95 && code <= 0x0bb9 && ch !== '஺';
}

export function isVowel(ch: string): boolean {
  return (VOWELS as readonly string[]).includes(ch);
}

/**
 * Normalize Tamil text: NFC composition (so ொ written as ெ + ா becomes one
 * code point) and removal of zero-width joiners that keyboards often leave behind.
 */
export function normalizeTamil(text: string): string {
  return text.normalize('NFC').replace(ZERO_WIDTH, '');
}

/** Convert ASCII digits to Tamil numerals: "2026" → "௨௦௨௬". */
export function toTamilNumerals(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => TAMIL_DIGITS[Number(d)]);
}

/** Convert Tamil numerals back to ASCII digits: "௨௦௨௬" → "2026". */
export function fromTamilNumerals(input: string): string {
  return input.replace(/[௦-௯]/g, (d) => String((d.codePointAt(0) ?? 0) - 0x0be6));
}
