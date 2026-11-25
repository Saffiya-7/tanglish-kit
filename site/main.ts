import {
  analyzeLetter,
  analyzeText,
  splitLetters,
  tagWords,
  tamilToTanglish,
  tanglishToTamil,
  type LetterInfo,
} from '../src/index.js';
import metrics from '../data/metrics.json' with { type: 'json' };

const REPO = 'Saffiya-7/tanglish-kit';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// ---- links & stats -------------------------------------------------------
for (const id of ['gh-link', 'gh-link-2']) $<HTMLAnchorElement>(id).href = `https://github.com/${REPO}`;
$('install-cmd').textContent = `npm install github:${REPO}`;

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
$('stats').innerHTML = [
  [pct(metrics.sentences.accuracyWithContext), 'word-level accuracy on code-mixed sentences'],
  [pct(metrics.wordHoldout.accuracy), 'accuracy on unseen words'],
  ['0', 'runtime dependencies'],
  ['100%', 'in-browser — nothing is uploaded'],
]
  .map(([v, l]) => `<li><b>${v}</b><span>${l}</span></li>`)
  .join('');

// ---- tabs ----------------------------------------------------------------
const tabs = document.querySelectorAll<HTMLButtonElement>('.tab');
tabs.forEach((tab) =>
  tab.addEventListener('click', () => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
      $(`panel-${t.dataset.tab}`).hidden = !active;
    });
  }),
);

// ---- Tanglish → Tamil ------------------------------------------------------
const inT2t = $<HTMLTextAreaElement>('in-t2t');
const optEnglish = $<HTMLInputElement>('opt-english');
const optNumerals = $<HTMLInputElement>('opt-numerals');
const optLexicon = $<HTMLInputElement>('opt-lexicon');

function renderT2t(): void {
  const text = inT2t.value;
  $('out-t2t').textContent = tanglishToTamil(text, {
    keepEnglish: optEnglish.checked,
    tamilNumerals: optNumerals.checked,
    useLexicon: optLexicon.checked,
  });
  $('chips').innerHTML = tagWords(text)
    .filter((t) => t.lang !== 'other')
    .map(
      (t) =>
        `<span class="chip ${t.lang}${t.confidence < 0.75 ? ' low' : ''}" title="${t.lang} · ${Math.round(
          t.confidence * 100,
        )}% confident">${escapeHtml(t.word)}</span>`,
    )
    .join('');
}
[inT2t, optEnglish, optNumerals, optLexicon].forEach((el) => el.addEventListener('input', renderT2t));

// ---- Tamil → Tanglish ------------------------------------------------------
const inT2r = $<HTMLTextAreaElement>('in-t2r');
function renderT2r(): void {
  const style = (document.querySelector<HTMLInputElement>('input[name="style"]:checked')?.value ?? 'casual') as
    | 'casual'
    | 'precise';
  const roman = tamilToTanglish(inT2r.value, { style });
  $('out-t2r').textContent = roman;
  const note = $('roundtrip');
  if (style === 'precise') {
    const back = tanglishToTamil(roman, { fixAutoCaps: false, useLexicon: false });
    note.textContent = back === inT2r.value.normalize('NFC') ? '✓ Converts back to exactly the same Tamil text.' : '';
  } else {
    note.textContent = 'Casual style is readable but lossy (ண/ன/ந all become “n”). Switch to Precise for a reversible form.';
  }
}
inT2r.addEventListener('input', renderT2r);
document.querySelectorAll('input[name="style"]').forEach((r) => r.addEventListener('change', renderT2r));

// ---- Letters ---------------------------------------------------------------
const inLetters = $<HTMLTextAreaElement>('in-letters');
const describe = (info: LetterInfo): string => {
  if (info.type === 'uyirmei') return `${info.mei} + ${info.uyir}`;
  if (info.type === 'mei') return info.group ?? 'மெய்';
  if (info.type === 'uyir') return info.length === 'nedil' ? 'நெடில்' : 'குறில்';
  return 'ஆய்தம்';
};

function renderLetters(): void {
  const text = inLetters.value;
  $('tiles').innerHTML = splitLetters(text)
    .map((l) => {
      if (/^\s$/.test(l)) return '<span class="tile space"></span>';
      const info = analyzeLetter(l);
      if (info.type === 'other') return `<span class="tile"><span class="l">${escapeHtml(l)}</span><span class="d">—</span></span>`;
      return `<span class="tile ${info.type}"><span class="l">${l}</span><span class="d">${describe(info)}</span></span>`;
    })
    .join('');
  const s = analyzeText(text);
  $('len-note').textContent = `· ${s.letters} letters, but JavaScript .length says ${text.length}`;
  const items: [number, string][] = [
    [s.letters, 'எழுத்துகள் letters'],
    [s.uyir, 'உயிர் vowels'],
    [s.mei, 'மெய் consonants'],
    [s.uyirmei, 'உயிர்மெய்'],
    [s.kuril, 'குறில் short'],
    [s.nedil, 'நெடில் long'],
    [s.vallinam, 'வல்லினம்'],
    [s.mellinam, 'மெல்லினம்'],
    [s.idaiyinam, 'இடையினம்'],
    [s.grantha, 'கிரந்தம் grantha'],
  ];
  $('statgrid').innerHTML = items.map(([n, label]) => `<li><b>${n}</b><span>${label}</span></li>`).join('');
}
inLetters.addEventListener('input', renderLetters);

// ---- copy buttons ----------------------------------------------------------
document.querySelectorAll<HTMLButtonElement>('.copy').forEach((btn) =>
  btn.addEventListener('click', async () => {
    const text = $(btn.dataset.copy!).textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Copy failed';
    }
    setTimeout(() => (btn.textContent = 'Copy'), 1200);
  }),
);

renderT2t();
renderT2r();
renderLetters();
