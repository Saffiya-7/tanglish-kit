import { lookupLexicon } from './lexicon.js';
import { tagWords } from './langid/index.js';
import { AYTHAM, PULLI, toTamilNumerals } from './tamil.js';

export interface TransliterateOptions {
  /**
   * Treat capitals as distinct letters (N=ண, L=ள, R=ற, S=ஸ, E=ஏ, O=ஓ, A/I/U = long vowels).
   * When false, everything is lowercased first. Default: true.
   */
  caseSensitive?: boolean;
  /**
   * Phone keyboards capitalise the first letter of a sentence ("Enna da").
   * When true, a word that is Capitalized-then-lowercase is treated as all lowercase,
   * and an ALL-CAPS word is lowercased. Default: true.
   */
  fixAutoCaps?: boolean;
  /** Use the built-in dictionary of common Tanglish words. Default: true. */
  useLexicon?: boolean;
  /**
   * Leave words that the language model tags as English untouched,
   * e.g. "meeting cancel aa?" → "meeting cancel ஆ?". Default: false.
   */
  keepEnglish?: boolean;
  /** Convert ASCII digits to Tamil numerals. Default: false. */
  tamilNumerals?: boolean;
}

type VowelKey =
  | 'a' | 'aa' | 'A' | 'i' | 'ii' | 'ee' | 'I' | 'u' | 'uu' | 'oo' | 'U'
  | 'e' | 'E' | 'ai' | 'o' | 'O' | 'au';

/** [independent vowel, dependent sign] */
const VOWEL_TABLE: Record<VowelKey, [string, string]> = {
  a: ['அ', ''],
  aa: ['ஆ', 'ா'],
  A: ['ஆ', 'ா'],
  i: ['இ', 'ி'],
  ii: ['ஈ', 'ீ'],
  ee: ['ஈ', 'ீ'],
  I: ['ஈ', 'ீ'],
  u: ['உ', 'ு'],
  uu: ['ஊ', 'ூ'],
  oo: ['ஊ', 'ூ'],
  U: ['ஊ', 'ூ'],
  e: ['எ', 'ெ'],
  E: ['ஏ', 'ே'],
  ai: ['ஐ', 'ை'],
  o: ['ஒ', 'ொ'],
  O: ['ஓ', 'ோ'],
  au: ['ஔ', 'ௌ'],
};

const TWO_CHAR_VOWELS: VowelKey[] = ['aa', 'ii', 'ee', 'uu', 'oo', 'ai', 'au'];
const ONE_CHAR_VOWELS = new Set(['a', 'i', 'u', 'e', 'o', 'A', 'E', 'I', 'O', 'U']);

function matchVowel(w: string, i: number): VowelKey | null {
  const two = w.slice(i, i + 2);
  if ((TWO_CHAR_VOWELS as string[]).includes(two)) return two as VowelKey;
  const one = w[i];
  if (one !== undefined && ONE_CHAR_VOWELS.has(one)) return one as VowelKey;
  return null;
}

function isVowelStart(w: string, i: number): boolean {
  return i < w.length && ONE_CHAR_VOWELS.has(w[i]);
}

/** Simple one-letter consonants. Context-dependent letters (n, c, f, q, x) are handled in code. */
const SIMPLE: Record<string, string> = {
  k: 'க', g: 'க', s: 'ச', j: 'ஜ', t: 'ட', d: 'ட', p: 'ப', b: 'ப', m: 'ம', y: 'ய',
  r: 'ர', l: 'ல', v: 'வ', w: 'வ', h: 'ஹ', z: 'ழ',
  N: 'ண', L: 'ள', R: 'ற', S: 'ஸ',
};

/**
 * Builds Tamil output while tracking a "pending" consonant that still needs
 * either a vowel sign or a pulli (்).
 */
class Builder {
  private out: string[] = [];
  private pending = false;

  consonant(c: string): void {
    this.flush();
    this.out.push(c);
    this.pending = true;
  }

  vowel(key: VowelKey): void {
    const [independent, sign] = VOWEL_TABLE[key];
    if (this.pending) {
      this.out.push(sign);
      this.pending = false;
    } else {
      this.out.push(independent);
    }
  }

  raw(text: string): void {
    this.flush();
    this.out.push(text);
  }

  get lastWasVowel(): boolean {
    return !this.pending && this.out.length > 0;
  }

  private flush(): void {
    if (this.pending) {
      this.out.push(PULLI);
      this.pending = false;
    }
  }

  toString(): string {
    this.flush();
    return this.out.join('');
  }
}

/** Transliterate a single run of Latin letters with the phonetic rules. */
export function transliterateWordPhonetic(w: string): string {
  const b = new Builder();
  let i = 0;
  let afterNasalJ = false; // "nj"/"nc" — the j/c after ஞ becomes ச

  while (i < w.length) {
    const atStart = i === 0;
    const c = w[i];
    const c2 = w.slice(i, i + 2);
    const c3 = w.slice(i, i + 3);

    // ---- vowels -------------------------------------------------------
    const v = matchVowel(w, i);
    if (v) {
      const prevVowel = i > 0 && b.lastWasVowel;
      // Glide: a vowel followed by "i" and then a consonant/end → ய் (naai → நாய், poi → பொய்)
      if (prevVowel && v === 'i' && !isVowelStart(w, i + 1)) {
        b.consonant('ய');
      } else {
        b.vowel(v);
      }
      i += v.length;
      afterNasalJ = false;
      continue;
    }

    // ---- multi-letter consonant clusters ------------------------------
    if (c3 === 'ksh') { b.consonant('க'); b.consonant('ஷ'); i += 3; continue; }
    if (c3 === 'tth') { b.consonant('த'); b.consonant('த'); i += 3; continue; }
    if (c3 === 'cch') { b.consonant('ச'); b.consonant('ச'); i += 3; continue; }
    if (w.slice(i, i + 4) === 'chch') { b.consonant('ச'); b.consonant('ச'); i += 4; continue; }
    if (c3 === 'ndr' && !atStart) { b.consonant('ன'); b.consonant('ற'); i += 3; continue; }

    if (c2 === 'ng') {
      // enga → எங்க, sangam → சங்கம், but "ng" before a consonant/end → ங்
      b.consonant('ங');
      if (isVowelStart(w, i + 2)) b.consonant('க');
      i += 2;
      continue;
    }
    if (c2 === 'nj') {
      b.consonant('ஞ');
      if (!atStart && isVowelStart(w, i + 2)) b.consonant('ச'); // manjal → மஞ்சள்
      i += 2;
      continue;
    }
    if (c2 === 'zh') { b.consonant('ழ'); i += 2; continue; }
    if (c2 === 'sh') { b.consonant('ஷ'); i += 2; continue; }
    if (c2 === 'ch') {
      // Between vowels "ch" is the geminate ச்ச (pachai → பச்சை, vechu → வெச்சு);
      // a single intervocalic ச is written "s" in Tanglish (pasi → பசி).
      if (i > 0 && b.lastWasVowel && !afterNasalJ) b.consonant('ச');
      b.consonant('ச');
      i += 2;
      afterNasalJ = false;
      continue;
    }
    if (c2 === 'th' || c2 === 'dh') { b.consonant('த'); i += 2; continue; }
    if (c2 === 'kh' || c2 === 'gh') { b.consonant('க'); i += 2; continue; }
    if (c2 === 'ph' || c2 === 'bh') { b.consonant('ப'); i += 2; continue; }
    if (c2 === 'jh') { b.consonant('ஜ'); i += 2; continue; }
    if (c2 === 'tr' && !atStart) { b.consonant('ற'); b.consonant('ற'); i += 2; continue; } // kaatru → காற்று
    if (c2 === 'rr') { b.consonant('ற'); b.consonant('ற'); i += 2; continue; }
    if (c2 === 'nr' && !atStart) { b.consonant('ன'); b.consonant('ற'); i += 2; continue; } // enru → என்று

    // ---- context-sensitive single letters -----------------------------
    if (c === 'n') {
      const next = w.slice(i + 1, i + 3);
      const n1 = w[i + 1];
      if (atStart || next === 'th' || next === 'dh') b.consonant('ந');
      else if (n1 === 'd' || n1 === 't') b.consonant('ண'); // rendu → ரெண்டு
      else if (n1 === 'k' || n1 === 'g') b.consonant('ங');
      else if (n1 === 'j' || next === 'ch') { b.consonant('ஞ'); afterNasalJ = true; i += 1; continue; }
      else b.consonant('ன');
      i += 1;
      continue;
    }
    if ((c === 'j' || c === 'c') && afterNasalJ) {
      b.consonant('ச');
      afterNasalJ = false;
      i += 1;
      continue;
    }
    if (c === 'c') {
      // c before e/i/y sounds like s (city), otherwise k (coffee)
      const n1 = w[i + 1];
      b.consonant(n1 === 'e' || n1 === 'i' || n1 === 'y' ? 'ஸ' : 'க');
      i += 1;
      continue;
    }
    if (c === 'f') { b.raw(AYTHAM); b.consonant('ப'); i += 1; continue; }
    if (c === 'q') { b.raw(AYTHAM); i += 1; continue; }
    if (c === 'x') { b.consonant('க'); b.consonant('ஸ'); i += 1; continue; }

    const simple = SIMPLE[c];
    if (simple) {
      b.consonant(simple);
      i += 1;
      continue;
    }

    // Unknown character: keep it as-is.
    b.raw(c);
    i += 1;
  }

  return b.toString();
}

const SPECIAL_CAPITALS = /[BCDFGHJKMPQTVWXYZ]/g; // capitals that carry no meaning

function normalizeCase(word: string, opts: Required<TransliterateOptions>): string {
  if (!opts.caseSensitive) return word.toLowerCase();
  if (opts.fixAutoCaps) {
    if (word.length > 1 && word === word.toUpperCase()) return word.toLowerCase();
    if (word.length > 1 && /^[A-Z][a-z]+$/.test(word)) return word[0].toLowerCase() + word.slice(1);
  }
  return word.replace(SPECIAL_CAPITALS, (ch) => ch.toLowerCase());
}

const DEFAULTS: Required<TransliterateOptions> = {
  caseSensitive: true,
  fixAutoCaps: true,
  useLexicon: true,
  keepEnglish: false,
  tamilNumerals: false,
};

/** Transliterate one word (Latin letters only). */
export function transliterateWord(word: string, options: TransliterateOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  const normalized = normalizeCase(word, opts);
  if (opts.useLexicon && normalized === normalized.toLowerCase()) {
    const hit = lookupLexicon(normalized);
    if (hit) return hit;
  }
  return transliterateWordPhonetic(normalized);
}

/**
 * Convert Tanglish (Tamil written in Latin letters) to Tamil script.
 *
 * @example
 * tanglishToTamil('vanakkam nanba, epdi irukeenga?')
 * // → 'வணக்கம் நண்பா, எப்டி இருக்கீங்க?'
 */
export function tanglishToTamil(text: string, options: TransliterateOptions = {}): string {
  const opts = { ...DEFAULTS, ...options };
  const englishSpans = new Set<number>();
  if (opts.keepEnglish) {
    for (const tag of tagWords(text)) {
      if (tag.lang === 'en') englishSpans.add(tag.start);
    }
  }

  let result = text.replace(/[A-Za-z]+/g, (word, offset: number) =>
    englishSpans.has(offset) ? word : transliterateWord(word, opts),
  );
  if (opts.tamilNumerals) result = toTamilNumerals(result);
  return result;
}
