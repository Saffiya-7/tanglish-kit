import { describe, expect, it } from 'vitest';
import { charNgrams, detectLanguage, detectWordLanguage, tagWords, trainNaiveBayes } from '../src/index.js';

describe('detectWordLanguage', () => {
  it.each(['saaptiya', 'pannunga', 'theriyala', 'kozhambu', 'irukkom'])('%s is Tanglish', (w) => {
    expect(detectWordLanguage(w).lang).toBe('tanglish');
  });
  it.each(['meeting', 'deadline', 'tomorrow', 'presentation', 'weather'])('%s is English', (w) => {
    expect(detectWordLanguage(w).lang).toBe('en');
  });
});

describe('tagWords', () => {
  it('tags a code-mixed sentence word by word', () => {
    const tags = tagWords('machan meeting cancel aachu, office ku late');
    const byWord = Object.fromEntries(tags.filter((t) => t.lang !== 'other').map((t) => [t.word, t.lang]));
    expect(byWord).toEqual({
      machan: 'tanglish',
      meeting: 'en',
      cancel: 'en',
      aachu: 'tanglish',
      office: 'en',
      ku: 'tanglish',
      late: 'en',
    });
  });

  it('reports offsets into the original string', () => {
    const [first, second] = tagWords('vaa da');
    expect(first).toMatchObject({ word: 'vaa', start: 0, end: 3 });
    expect(second).toMatchObject({ word: 'da', start: 4, end: 6 });
  });

  it('tags Tamil script and punctuation by script', () => {
    const tags = tagWords('வணக்கம் 2026!');
    expect(tags.map((t) => [t.word, t.lang])).toEqual([
      ['வணக்கம்', 'tamil'],
      ['2026', 'other'],
      ['!', 'other'],
    ]);
  });
});

describe('detectLanguage', () => {
  it('summarises a code-mixed text', () => {
    const s = detectLanguage('naalaiku exam iruku, nee padichiya?');
    expect(s.codeMixed).toBe(true);
    expect(s.dominant).toBe('tanglish');
  });

  it('handles pure Tamil and empty input', () => {
    expect(detectLanguage('தமிழ் வாழ்க').dominant).toBe('tamil');
    expect(detectLanguage('   ').dominant).toBe('none');
  });
});

describe('custom models', () => {
  it('charNgrams adds boundary markers', () => {
    expect(charNgrams('ab', 2)).toEqual(['a', 'b', '^a', 'ab', 'b$']);
  });

  it('a model trained on your own data can be passed in', () => {
    const model = trainNaiveBayes(['zzz', 'zzzz'], ['qqq', 'qqqq'], 3);
    expect(tagWords('qq zz', { model, context: 0 }).map((t) => t.lang)).toEqual(['tanglish', 'en']);
  });
});
