import { describe, expect, it } from 'vitest';
import { tanglishToTamil, transliterateWordPhonetic } from '../src/index.js';

describe('tanglishToTamil — phonetic rules', () => {
  const cases: [string, string][] = [
    ['thamizh', 'தமிழ்'],
    ['konjam', 'கொஞ்சம்'],
    ['vandhu', 'வந்து'],
    ['rendu', 'ரெண்டு'],
    ['kaatru', 'காற்று'],
    ['endru', 'என்று'],
    ['enga', 'எங்க'],
    ['sangam', 'சங்கம்'],
    ['naai', 'நாய்'],
    ['poi', 'பொய்'],
    ['kai', 'கை'],
    ['paatti', 'பாட்டி'],
    ['pazham', 'பழம்'],
    ['kuzhandhai', 'குழந்தை'],
    ['ooru', 'ஊரு'],
    ['saappaadu', 'சாப்பாடு'],
    ['pachai', 'பச்சை'],
    ['pacchai', 'பச்சை'],
    ['pachchai', 'பச்சை'],
    ['panchu', 'பஞ்சு'],
    ['pasi', 'பசி'],
    ['romba', 'ரொம்ப'],
    ['illa', 'இல்ல'],
    ['enna', 'என்ன'],
    ['auvaiyaar', 'ஔவையார்'],
    ['kshEthram', 'க்ஷேத்ரம்'],
    ['fan', 'ஃபன்'],
  ];
  it.each(cases)('%s → %s', (input, expected) => {
    expect(tanglishToTamil(input, { useLexicon: false })).toBe(expected);
  });

  it('uses capitals for the letters Latin cannot tell apart', () => {
    expect(transliterateWordPhonetic('kaNNu')).toBe('கண்ணு');
    expect(transliterateWordPhonetic('paLLi')).toBe('பள்ளி');
    expect(transliterateWordPhonetic('kaaRRu')).toBe('காற்று');
    expect(transliterateWordPhonetic('vEnum')).toBe('வேனும்');
    expect(transliterateWordPhonetic('Odu')).toBe('ஓடு');
    expect(transliterateWordPhonetic('Sree')).toBe('ஸ்ரீ');
  });

  it('word-initial n is ந, later n is ன', () => {
    expect(tanglishToTamil('naan', { useLexicon: false })).toBe('நான்');
    expect(tanglishToTamil('nanmai', { useLexicon: false })).toBe('நன்மை');
  });
});

describe('tanglishToTamil — sentences & options', () => {
  it('converts a sentence and keeps punctuation', () => {
    expect(tanglishToTamil('vanakkam nanba, epdi irukeenga?')).toBe('வணக்கம் நண்பா, எப்டி இருக்கீங்க?');
  });

  it('ignores phone auto-capitalisation by default', () => {
    expect(tanglishToTamil('Enna da panra')).toBe('என்ன டா பண்ற');
    expect(tanglishToTamil('ENNA')).toBe('என்ன');
  });

  it('can treat capitals literally', () => {
    expect(tanglishToTamil('Eri', { fixAutoCaps: false })).toBe('ஏரி');
  });

  it('keepEnglish leaves English words untouched', () => {
    expect(tanglishToTamil('machan meeting cancel aachu', { keepEnglish: true })).toBe(
      'மச்சான் meeting cancel ஆச்சு',
    );
  });

  it('lexicon fixes words the rules cannot', () => {
    expect(tanglishToTamil('vanakkam')).toBe('வணக்கம்');
    expect(tanglishToTamil('amma')).toBe('அம்மா');
    expect(tanglishToTamil('vanakkam', { useLexicon: false })).toBe('வனக்கம்');
  });

  it('tamilNumerals converts digits', () => {
    expect(tanglishToTamil('2026 la', { tamilNumerals: true })).toBe('௨௦௨௬ ல');
  });

  it('leaves Tamil script and symbols alone', () => {
    expect(tanglishToTamil('தமிழ் 🙂 vaa')).toBe('தமிழ் 🙂 வா');
  });
});
