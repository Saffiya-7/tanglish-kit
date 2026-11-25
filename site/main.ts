import {
  analyzeLetter,
  analyzeText,
  scoreWord,
  splitLetters,
  tagWords,
  tamilToTanglish,
  tanglishToTamil,
  type LetterInfo,
  type WordTag,
} from '../src/index.js';
import metrics from '../data/metrics.json' with { type: 'json' };

const REPO = 'Saffiya-7/tanglish-kit';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer: number | undefined;
function toast(message: string): void {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 1600);
}

function chipsHtml(tags: WordTag[], withConfidence = false): string {
  return tags
    .filter((t) => t.lang !== 'other')
    .map((t) => {
      const conf = Math.round(t.confidence * 100);
      const label = t.lang === 'en' ? 'English' : t.lang === 'tamil' ? 'Tamil script' : 'Tanglish';
      return `<span class="chip ${t.lang}${t.confidence < 0.75 ? ' low' : ''}" title="${label} · ${conf}% confident">${escapeHtml(
        t.word,
      )}${withConfidence && t.lang !== 'tamil' ? `<span class="conf">${conf}%</span>` : ''}</span>`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// theme
// ---------------------------------------------------------------------------
$('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
});

// ---------------------------------------------------------------------------
// GitHub stars (best effort; the unauthenticated API is rate-limited)
// ---------------------------------------------------------------------------
fetch(`https://api.github.com/repos/${REPO}`)
  .then((r) => (r.ok ? r.json() : null))
  .then((repo: { stargazers_count?: number } | null) => {
    if (repo && typeof repo.stargazers_count === 'number' && repo.stargazers_count > 0) {
      const el = $('star-count');
      el.textContent = repo.stargazers_count.toLocaleString();
      el.hidden = false;
    }
  })
  .catch(() => {});

// ---------------------------------------------------------------------------
// metrics (from data/metrics.json, written by `npm run train`)
// ---------------------------------------------------------------------------
$('metrics').innerHTML = [
  [pct(metrics.sentences.accuracyWithContext), 'word accuracy on code-mixed sentences'],
  [pct(metrics.wordHoldout.accuracy), 'accuracy on unseen words'],
  ['0', 'runtime dependencies'],
  ['100%', 'in-browser, nothing uploaded'],
]
  .map(([v, l]) => `<li><b>${v}</b><span>${l}</span></li>`)
  .join('');

$('eval-numbers').innerHTML = [
  [pct(metrics.wordHoldout.accuracy), `${metrics.wordHoldout.words} unseen words`],
  [pct(metrics.sentences.accuracyNoContext), 'sentences, word alone'],
  [pct(metrics.sentences.accuracyWithContext), 'sentences, with context'],
  [metrics.features.toLocaleString(), 'n-gram features'],
]
  .map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`)
  .join('');

// "How it works" examples are computed live, not hard-coded.
{
  const sample = 'office ku late';
  const fmt = (w: string) => {
    const s = scoreWord(w);
    return `${w} ${s >= 0 ? '+' : '−'}${Math.abs(s).toFixed(1)}`;
  };
  $('ex-scores').textContent = ['ku', 'late'].map(fmt).join(' · ');
  $('ex-tags').textContent = tagWords(sample)
    .map((t) => t.lang)
    .join(' · ');
  $('ex-out').textContent = tanglishToTamil(sample, { keepEnglish: true });
}

// ---------------------------------------------------------------------------
// hero: live typing demo driven by the real library
// ---------------------------------------------------------------------------
const HERO_PHRASES = [
  'machan meeting cancel aachu',
  'naalaiku exam iruku, nee padichiya?',
  'vanakkam nanba, epdi irukeenga?',
  'office ku late aagiduchu da',
];

function renderHero(text: string, typing: boolean): void {
  $('hero-in').innerHTML = `${escapeHtml(text)}${typing ? '<span class="caret"></span>' : ''}`;
  $('hero-out').textContent = tanglishToTamil(text, { keepEnglish: true });
  // Only tag words that are complete, so chips don't flicker mid-word.
  const complete = typing ? text.replace(/[A-Za-z]+$/, '') : text;
  $('hero-tags').innerHTML = chipsHtml(tagWords(complete));
}

if (reducedMotion) {
  renderHero(HERO_PHRASES[0], false);
} else {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  (async () => {
    for (let p = 0; ; p = (p + 1) % HERO_PHRASES.length) {
      const phrase = HERO_PHRASES[p];
      for (let i = 1; i <= phrase.length; i++) {
        renderHero(phrase.slice(0, i), true);
        await sleep(phrase[i - 1] === ' ' ? 120 : 55 + Math.random() * 45);
      }
      renderHero(phrase, false); // finished: tag every word, including the last
      await sleep(2600);
      for (let i = phrase.length; i >= 0; i -= 2) {
        renderHero(phrase.slice(0, i), true);
        await sleep(14);
      }
      await sleep(300);
    }
  })();
}

// ---------------------------------------------------------------------------
// playground: modes
// ---------------------------------------------------------------------------
type Mode = 't2t' | 't2r' | 'letters';

const EXAMPLES: Record<Mode, [label: string, text: string][]> = {
  t2t: [
    ['Chat', 'vanakkam nanba! epdi irukeenga? naalaiku office la meeting cancel aachu, so namma kovil ku polama?'],
    ['Office', 'machan project deadline romba tight ah irukku, naan already late, boss ku sollidu'],
    ['Food', 'amma, innaiku dinner ku dosai sambar venum, kaapi kooda podunga'],
    ['Capitals', 'kaNNu paLLi kaaRRu Eri Odu thamizh'],
  ],
  t2r: [
    ['Kural 1', 'அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு'],
    ['Puranānūru', 'யாதும் ஊரே யாவரும் கேளிர். தீதும் நன்றும் பிறர் தர வாரா.'],
    ['Chat', 'வணக்கம் நண்பா! எப்படி இருக்கீங்க? நாளைக்கு சந்திக்கலாம்.'],
  ],
  letters: [
    ['Grantha', 'க்ஷேத்திரம் ஸ்ரீ ஜன்னல்'],
    ['Aytham', 'எஃகு அஃது'],
    ['Name', 'ஔவையார்'],
  ],
};

const segs = Array.from(document.querySelectorAll<HTMLButtonElement>('.seg'));
let mode: Mode = 't2t';

function setMode(next: Mode, focus = false): void {
  mode = next;
  for (const seg of segs) {
    const active = seg.dataset.mode === next;
    seg.classList.toggle('active', active);
    seg.setAttribute('aria-selected', String(active));
    seg.tabIndex = active ? 0 : -1;
    $(`panel-${seg.dataset.mode}`).hidden = !active;
    if (active && focus) seg.focus();
  }
  $('examples').innerHTML = EXAMPLES[next]
    .map(([label], i) => `<button class="ex-chip" data-example="${i}">${escapeHtml(label)}</button>`)
    .join('');
}

segs.forEach((seg) => {
  seg.addEventListener('click', () => setMode(seg.dataset.mode as Mode));
  seg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = segs.indexOf(seg);
    const j = (i + (e.key === 'ArrowRight' ? 1 : segs.length - 1)) % segs.length;
    setMode(segs[j].dataset.mode as Mode, true);
  });
});

const inputs: Record<Mode, HTMLTextAreaElement> = {
  t2t: $<HTMLTextAreaElement>('in-t2t'),
  t2r: $<HTMLTextAreaElement>('in-t2r'),
  letters: $<HTMLTextAreaElement>('in-letters'),
};

$('examples').addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-example]');
  if (!btn) return;
  const input = inputs[mode];
  input.value = EXAMPLES[mode][Number(btn.dataset.example)][1];
  input.dispatchEvent(new Event('input'));
  input.focus();
});

// ---------------------------------------------------------------------------
// Tanglish → Tamil
// ---------------------------------------------------------------------------
const optEnglish = $<HTMLInputElement>('opt-english');
const optLexicon = $<HTMLInputElement>('opt-lexicon');
const optNumerals = $<HTMLInputElement>('opt-numerals');

function renderT2t(): void {
  const text = inputs.t2t.value;
  const t0 = performance.now();
  const out = tanglishToTamil(text, {
    keepEnglish: optEnglish.checked,
    useLexicon: optLexicon.checked,
    tamilNumerals: optNumerals.checked,
  });
  const tags = tagWords(text);
  const ms = performance.now() - t0;
  $('out-t2t').textContent = out;
  $('chips').innerHTML = chipsHtml(tags, true) || '<span class="pg-meta">Type something to see each word tagged.</span>';
  const words = tags.filter((t) => t.lang !== 'other');
  const count = (l: string) => words.filter((t) => t.lang === l).length;
  $('meta-t2t').textContent = words.length
    ? `${words.length} words · ${count('tanglish')} Tanglish · ${count('en')} English · ${ms < 1 ? '<1' : ms.toFixed(1)} ms`
    : '';
}
[inputs.t2t, optEnglish, optLexicon, optNumerals].forEach((el) => el.addEventListener('input', renderT2t));

// ---------------------------------------------------------------------------
// Tamil → Tanglish
// ---------------------------------------------------------------------------
function currentStyle(): 'casual' | 'precise' {
  return (document.querySelector<HTMLInputElement>('input[name="style"]:checked')?.value ?? 'casual') as
    | 'casual'
    | 'precise';
}

function renderT2r(): void {
  const text = inputs.t2r.value;
  const style = currentStyle();
  const roman = tamilToTanglish(text, { style });
  $('out-t2r').textContent = roman;
  let note = '';
  if (text.trim()) {
    if (style === 'precise' && /[A-Za-z]/.test(text)) {
      note = 'English words pass through; the round trip applies to Tamil text';
    } else if (style === 'precise') {
      const back = tanglishToTamil(roman, { fixAutoCaps: false, useLexicon: false });
      note = back === text.normalize('NFC') ? '✓ converts back to identical Tamil' : 'round trip differs (rare letter combination)';
    } else {
      note = `${analyzeText(text).letters} Tamil letters`;
    }
  }
  $('meta-t2r').textContent = note;
}
inputs.t2r.addEventListener('input', renderT2r);
document.querySelectorAll('input[name="style"]').forEach((r) => r.addEventListener('change', renderT2r));

// ---------------------------------------------------------------------------
// swap direction
// ---------------------------------------------------------------------------
$('swap-t2t').addEventListener('click', () => {
  inputs.t2r.value = $('out-t2t').textContent ?? '';
  setMode('t2r');
  renderT2r();
  inputs.t2r.focus();
});
$('swap-t2r').addEventListener('click', () => {
  inputs.t2t.value = $('out-t2r').textContent ?? '';
  setMode('t2t');
  renderT2t();
  inputs.t2t.focus();
});

// ---------------------------------------------------------------------------
// Letter analyzer
// ---------------------------------------------------------------------------
const describe = (info: LetterInfo): string => {
  if (info.type === 'uyirmei') return `${info.mei} + ${info.uyir}`;
  if (info.type === 'mei') return { vallinam: 'வல்லினம்', mellinam: 'மெல்லினம்', idaiyinam: 'இடையினம்', grantha: 'கிரந்தம்' }[info.group ?? 'grantha'];
  if (info.type === 'uyir') return info.length === 'nedil' ? 'நெடில்' : 'குறில்';
  return 'ஆய்தம்';
};

function renderLetters(): void {
  const text = inputs.letters.value;
  $('tiles').innerHTML = splitLetters(text)
    .map((l, i) => {
      if (/^\s$/.test(l)) return '<span class="tile space"></span>';
      const info = analyzeLetter(l);
      const delay = `style="animation-delay:${Math.min(i * 18, 400)}ms"`;
      if (info.type === 'other') return `<span class="tile" ${delay}><span class="l">${escapeHtml(l)}</span><span class="d">·</span></span>`;
      return `<span class="tile ${info.type}" ${delay}><span class="l">${l}</span><span class="d">${describe(info)}</span></span>`;
    })
    .join('');
  const s = analyzeText(text);
  $('meta-letters').textContent = `${s.letters} letters · JS .length = ${text.length}`;
  const items: [number, string][] = [
    [s.letters, 'எழுத்துகள் · letters'],
    [s.uyir, 'உயிர் · vowels'],
    [s.mei, 'மெய் · consonants'],
    [s.uyirmei, 'உயிர்மெய்'],
    [s.kuril, 'குறில் · short'],
    [s.nedil, 'நெடில் · long'],
    [s.vallinam, 'வல்லினம்'],
    [s.mellinam, 'மெல்லினம்'],
    [s.idaiyinam, 'இடையினம்'],
    [s.grantha, 'கிரந்தம் · grantha'],
  ];
  $('statgrid').innerHTML = items.map(([n, label]) => `<li><b>${n}</b><span>${label}</span></li>`).join('');
}
inputs.letters.addEventListener('input', renderLetters);

// ---------------------------------------------------------------------------
// clear / copy
// ---------------------------------------------------------------------------
document.querySelectorAll<HTMLButtonElement>('[data-clear]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const input = $<HTMLTextAreaElement>(btn.dataset.clear!);
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.focus();
  }),
);

document.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach((btn) =>
  btn.addEventListener('click', async () => {
    let text = '';
    if (btn.dataset.copyFrom) text = $(btn.dataset.copyFrom).textContent ?? '';
    if (btn.dataset.copyFromActive) {
      text = document.querySelector<HTMLElement>('pre.code:not([hidden])')?.innerText ?? '';
    }
    if (!text.trim()) return toast('Nothing to copy yet');
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard');
    } catch {
      toast('Copy failed, select the text manually');
    }
  }),
);

// ---------------------------------------------------------------------------
// code tabs
// ---------------------------------------------------------------------------
document.querySelectorAll<HTMLButtonElement>('.code-tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    document.querySelectorAll<HTMLButtonElement>('.code-tab').forEach((t) => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll<HTMLElement>('pre.code').forEach((pre) => {
      pre.hidden = pre.dataset.codePanel !== tab.dataset.code;
    });
  }),
);

// ---------------------------------------------------------------------------
// initial state
// ---------------------------------------------------------------------------
inputs.t2t.value = EXAMPLES.t2t[0][1];
inputs.t2r.value = EXAMPLES.t2r[1][1];
inputs.letters.value = EXAMPLES.letters[0][1] + ' தமிழ்';
setMode('t2t');
renderT2t();
renderT2r();
renderLetters();
