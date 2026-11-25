import { describe, expect, it } from 'vitest';
import {
  analyzeLetter,
  analyzeText,
  countTamilLetters,
  fromTamilNumerals,
  normalizeTamil,
  splitLetters,
  toTamilNumerals,
} from '../src/index.js';

describe('splitLetters', () => {
  it('splits into letters a reader would count', () => {
    expect(splitLetters('தமிழ்')).toEqual(['த', 'மி', 'ழ்']);
    expect('தமிழ்'.length).toBe(5); // why this function exists
  });

  it('keeps க்ஷ and ஸ்ரீ together', () => {
    expect(splitLetters('க்ஷேத்திரம்')).toEqual(['க்ஷே', 'த்', 'தி', 'ர', 'ம்']);
    expect(splitLetters('ஸ்ரீ')).toEqual(['ஸ்ரீ']);
  });

  it('passes other characters through', () => {
    expect(splitLetters('அ a!')).toEqual(['அ', ' ', 'a', '!']);
  });

  it('counts only Tamil letters', () => {
    expect(countTamilLetters('வணக்கம் world!')).toBe(5);
  });
});

describe('analyzeLetter', () => {
  it('classifies vowels', () => {
    expect(analyzeLetter('அ')).toMatchObject({ type: 'uyir', length: 'kuril' });
    expect(analyzeLetter('ஔ')).toMatchObject({ type: 'uyir', length: 'nedil' });
  });

  it('decomposes uyirmei into mei + uyir', () => {
    expect(analyzeLetter('கா')).toMatchObject({ type: 'uyirmei', mei: 'க்', uyir: 'ஆ', length: 'nedil', group: 'vallinam' });
    expect(analyzeLetter('ம')).toMatchObject({ type: 'uyirmei', mei: 'ம்', uyir: 'அ', length: 'kuril', group: 'mellinam' });
  });

  it('classifies mei, aytham and grantha', () => {
    expect(analyzeLetter('ழ்')).toMatchObject({ type: 'mei', group: 'idaiyinam', grantha: false });
    expect(analyzeLetter('ஃ')).toMatchObject({ type: 'aytham' });
    expect(analyzeLetter('ஜா')).toMatchObject({ type: 'uyirmei', grantha: true });
    expect(analyzeLetter('x')).toMatchObject({ type: 'other' });
  });
});

describe('analyzeText', () => {
  it('summarises letter types', () => {
    expect(analyzeText('தமிழ்')).toMatchObject({
      letters: 3, mei: 1, uyirmei: 2, kuril: 2, vallinam: 1, mellinam: 1, idaiyinam: 1, codePoints: 5,
    });
  });
});

describe('numerals & normalisation', () => {
  it('converts numerals both ways', () => {
    expect(toTamilNumerals(2026)).toBe('௨௦௨௬');
    expect(fromTamilNumerals('௨௦௨௬')).toBe('2026');
  });

  it('strips zero-width joiners and composes vowel signs', () => {
    expect(normalizeTamil('க‍ொ'.normalize('NFD'))).toBe('கொ');
  });
});
