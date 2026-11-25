import { describe, expect, it } from 'vitest';
import { tamilToTanglish, tanglishToTamil } from '../src/index.js';

describe('tamilToTanglish — casual', () => {
  const cases: [string, string][] = [
    ['தமிழ்', 'thamizh'],
    ['வணக்கம்', 'vanakkam'],
    ['நன்றி', 'nandri'],
    ['வந்து', 'vandhu'],
    ['ரெண்டு', 'rendu'],
    ['காற்று', 'kaatru'],
    ['எங்கே', 'enge'],
    ['அது', 'adhu'],
    ['நகரம்', 'nagaram'],
    ['அன்பு', 'anbu'],
    ['ரொம்ப', 'romba'],
    ['சாப்பாடு', 'saappaadu'],
    ['நண்பா', 'nanbaa'],
    ['ஸ்ரீ', 'sree'],
    ['ஃபேன்', 'fen'],
  ];
  it.each(cases)('%s → %s', (input, expected) => {
    expect(tamilToTanglish(input)).toBe(expected);
  });

  it('handles sentences, punctuation and Tamil numerals', () => {
    expect(tamilToTanglish('வணக்கம், நண்பா! ௨௦௨௬')).toBe('vanakkam, nanbaa! 2026');
  });

  it('handles decomposed vowel signs (ெ + ா) via NFC', () => {
    expect(tamilToTanglish('கொ'.normalize('NFD'))).toBe('ko');
  });
});

describe('tamilToTanglish — precise round trip', () => {
  const words = [
    'தமிழ்', 'வணக்கம்', 'நன்றி', 'எங்கே', 'மஞ்சள்', 'வந்து', 'ரெண்டு', 'காற்று', 'பத்து',
    'பட்டம்', 'ஏரி', 'ஓடு', 'பச்சை', 'சிங்கம்', 'கண்', 'நாய்', 'பொய்', 'கை', 'ஔவையார்',
    'ஸ்ரீ', 'க்ஷேத்திரம்', 'ஃபேன்', 'தண்ணீர்', 'பள்ளி', 'வாழை', 'சென்னை', 'மதுரை',
    'கோயம்புத்தூர்', 'திருக்குறள்', 'இந்தியா', 'ஞானம்', 'அன்பு', 'உலகம்', 'ஊர்', 'ஐந்து',
  ];
  it.each(words)('%s survives Tamil → precise Tanglish → Tamil', (word) => {
    const roman = tamilToTanglish(word, { style: 'precise' });
    expect(tanglishToTamil(roman, { fixAutoCaps: false, useLexicon: false })).toBe(word);
  });
});
