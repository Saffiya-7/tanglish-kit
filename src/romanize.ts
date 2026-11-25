import { AYTHAM, PULLI, SIGN_VOWEL, fromTamilNumerals, normalizeTamil } from './tamil.js';

export type RomanStyle = 'casual' | 'precise';

export interface RomanizeOptions {
  /**
   * - `casual` (default): how people actually type Tanglish — "vanakkam", "nandri".
   *   Readable but lossy (ண/ன/ந all become "n").
   * - `precise`: case-sensitive scheme (N=ண, L=ள, R=ற, S=ஸ, E=ஏ, O=ஓ) that
   *   `tanglishToTamil(..., { fixAutoCaps: false })` turns back into the same Tamil text.
   */
  style?: RomanStyle;
}

const CONS: Record<string, [casual: string, precise: string]> = {
  'க': ['k', 'k'],
  'ங': ['ng', 'ng'],
  'ச': ['s', 's'],
  'ஞ': ['nj', 'nj'],
  'ட': ['d', 'd'],
  'ண': ['n', 'N'],
  'த': ['th', 'th'],
  'ந': ['n', 'n'],
  'ப': ['p', 'p'],
  'ம': ['m', 'm'],
  'ய': ['y', 'y'],
  'ர': ['r', 'r'],
  'ல': ['l', 'l'],
  'வ': ['v', 'v'],
  'ழ': ['zh', 'zh'],
  'ள': ['l', 'L'],
  'ற': ['r', 'R'],
  'ன': ['n', 'n'],
  'ஜ': ['j', 'j'],
  'ஶ': ['sh', 'sh'],
  'ஷ': ['sh', 'sh'],
  'ஸ': ['s', 'S'],
  'ஹ': ['h', 'h'],
};

const VOWEL_ROMAN: Record<string, [casual: string, precise: string]> = {
  'அ': ['a', 'a'],
  'ஆ': ['aa', 'aa'],
  'இ': ['i', 'i'],
  'ஈ': ['ee', 'ee'],
  'உ': ['u', 'u'],
  'ஊ': ['oo', 'oo'],
  'எ': ['e', 'e'],
  'ஏ': ['e', 'E'],
  'ஐ': ['ai', 'ai'],
  'ஒ': ['o', 'o'],
  'ஓ': ['o', 'O'],
  'ஔ': ['au', 'au'],
};

const NASALS = new Set(['ங', 'ஞ', 'ண', 'ந', 'ம', 'ன']);

/**
 * Two-consonant clusters (first one carries a pulli) that Tanglish writes specially.
 * `beforeConsonant` is used when the second consonant has no vowel: the short
 * spelling (ங்க + a → "nga", ஞ்ச + a → "nja") already implies it before a vowel.
 */
const CLUSTERS: Record<string, { casual: string; precise: string; beforeConsonant?: string }> = {
  'ஙக': { casual: 'ng', precise: 'ng', beforeConsonant: 'ngk' },
  'ஞச': { casual: 'nj', precise: 'nj', beforeConsonant: 'njs' },
  'நத': { casual: 'ndh', precise: 'nth' },
  'ணட': { casual: 'nd', precise: 'Nd' },
  'னற': { casual: 'ndr', precise: 'nR' },
  'றற': { casual: 'tr', precise: 'RR' },
  'தத': { casual: 'tth', precise: 'tth' },
  'டட': { casual: 'tt', precise: 'tt' },
  'சச': { casual: 'cch', precise: 'cch' },
};

/**
 * Convert Tamil script to Tanglish (Latin letters).
 *
 * @example
 * tamilToTanglish('வணக்கம் நண்பா')               // → 'vanakkam nanbaa'
 * tamilToTanglish('வணக்கம்', { style: 'precise' }) // → 'vaNakkam'
 */
export function tamilToTanglish(text: string, options: RomanizeOptions = {}): string {
  const idx = options.style === 'precise' ? 1 : 0;
  const chars = Array.from(normalizeTamil(fromTamilNumerals(text)));
  const casual = idx === 0;
  let out = '';
  let i = 0;
  // Context for casual spelling: was the previous sound a vowel / a nasal with pulli?
  let prevVowel = false;
  let prevNasal = false;

  /** Emit the vowel that follows the consonant at position `at`; returns chars consumed after it. */
  const vowelAfter = (at: number): number => {
    const next = chars[at + 1];
    if (next === PULLI) {
      prevVowel = false;
      prevNasal = NASALS.has(chars[at]);
      return 1;
    }
    prevVowel = true;
    prevNasal = false;
    const vowel = next !== undefined ? SIGN_VOWEL[next] : undefined;
    if (vowel) {
      out += VOWEL_ROMAN[vowel][idx];
      return 1;
    }
    out += 'a';
    return 0;
  };

  while (i < chars.length) {
    const ch = chars[i];

    if (CONS[ch]) {
      // Cluster: consonant + pulli + consonant
      if (chars[i + 1] === PULLI && chars[i + 2] !== undefined && CONS[chars[i + 2]]) {
        const cluster = CLUSTERS[ch + chars[i + 2]];
        if (cluster) {
          const secondHasVowel = chars[i + 3] !== PULLI;
          out += !secondHasVowel && cluster.beforeConsonant ? cluster.beforeConsonant : idx ? cluster.precise : cluster.casual;
          i += 3 + vowelAfter(i + 2);
          continue;
        }
      }
      let roman = CONS[ch][idx];
      if (casual) {
        // Tamil voices stops in these positions, and Tanglish spells them that way:
        // அது → adhu, நகரம் → nagaram, அன்பு → anbu, கொம்பு → kombu.
        const hasVowel = chars[i + 1] !== PULLI;
        if (ch === 'த' && prevVowel && hasVowel) roman = 'dh';
        else if (ch === 'க' && prevVowel && hasVowel) roman = 'g';
        else if (ch === 'ப' && prevNasal) roman = 'b';
      }
      out += roman;
      i += 1 + vowelAfter(i);
      continue;
    }

    if (VOWEL_ROMAN[ch]) {
      out += VOWEL_ROMAN[ch][idx];
      prevVowel = true;
      prevNasal = false;
      i += 1;
      continue;
    }
    prevVowel = false;
    prevNasal = false;

    if (ch === AYTHAM) {
      if (chars[i + 1] === 'ப') {
        out += 'f';
        i += 2 + vowelAfter(i + 1);
      } else {
        out += idx ? 'q' : 'h';
        i += 1;
      }
      continue;
    }

    // Stray vowel sign or pulli (malformed input) — drop it; anything else passes through.
    if (ch === PULLI || SIGN_VOWEL[ch]) {
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
