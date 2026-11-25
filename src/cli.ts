#!/usr/bin/env node
import { analyzeText, splitLetters } from './letters.js';
import { tagWords } from './langid/index.js';
import { tamilToTanglish } from './romanize.js';
import { tanglishToTamil } from './transliterate.js';

const HELP = `tanglish — Tamil & Tanglish toolkit

Usage:
  tanglish [options] [text]        (reads stdin when no text is given)

Options:
  (default)            Tanglish → Tamil       tanglish "vanakkam nanba"
  -r, --reverse        Tamil → Tanglish       tanglish -r "வணக்கம்"
  -p, --precise        Precise (reversible) romanization with -r
  -e, --keep-english   Leave English words untouched
  -t, --tag            Tag each word as tamil / tanglish / en
  -l, --letters        Split into Tamil letters and show stats
  -h, --help           Show this help
`;

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith('-')));
  const has = (...names: string[]) => names.some((n) => flags.has(n));
  if (has('-h', '--help')) {
    process.stdout.write(HELP);
    return;
  }

  const text = args.filter((a) => !a.startsWith('-')).join(' ') || (await readStdin()).replace(/\n$/, '');
  if (!text) {
    process.stdout.write(HELP);
    process.exitCode = 1;
    return;
  }

  if (has('-t', '--tag')) {
    for (const t of tagWords(text)) {
      if (t.lang === 'other') continue;
      console.log(`${t.word.padEnd(16)} ${t.lang.padEnd(9)} ${(t.confidence * 100).toFixed(0)}%`);
    }
  } else if (has('-l', '--letters')) {
    console.log(splitLetters(text).filter((l) => l.trim()).join(' | '));
    console.log(analyzeText(text));
  } else if (has('-r', '--reverse')) {
    console.log(tamilToTanglish(text, { style: has('-p', '--precise') ? 'precise' : 'casual' }));
  } else {
    console.log(tanglishToTamil(text, { keepEnglish: has('-e', '--keep-english') }));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
