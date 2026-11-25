/** Character n-gram features with word-boundary markers: "vaa" → v, a, ^v, va, aa, a$, ^va, vaa, aa$ … */
export function charNgrams(word: string, maxN: number): string[] {
  const w = `^${word.toLowerCase()}$`;
  const out: string[] = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i + n <= w.length; i++) {
      const gram = w.slice(i, i + n);
      if (gram === '^' || gram === '$') continue;
      out.push(gram);
    }
  }
  return out;
}

export interface NaiveBayesModel {
  /** Largest n-gram size used. */
  maxN: number;
  /** Additive smoothing constant. */
  alpha: number;
  /** Total feature count per class: [english, tanglish]. */
  totals: [number, number];
  /** Number of distinct features. */
  vocab: number;
  /** feature → [english count, tanglish count] */
  counts: Record<string, [number, number]>;
}

/** Train a two-class multinomial Naive Bayes model on word lists. */
export function trainNaiveBayes(english: string[], tanglish: string[], maxN = 4, alpha = 0.5): NaiveBayesModel {
  const counts: Record<string, [number, number]> = {};
  const totals: [number, number] = [0, 0];
  const add = (words: string[], cls: 0 | 1) => {
    for (const word of words) {
      for (const f of charNgrams(word, maxN)) {
        (counts[f] ??= [0, 0])[cls]++;
        totals[cls]++;
      }
    }
  };
  add(english, 0);
  add(tanglish, 1);
  return { maxN, alpha, totals, vocab: Object.keys(counts).length, counts };
}

/**
 * Log-odds that `word` is Tanglish rather than English (positive → Tanglish).
 * Features never seen in training are skipped instead of smoothed, so an
 * unusual word is judged only on the parts the model knows.
 */
export function logOdds(model: NaiveBayesModel, word: string): number {
  const { alpha, totals, vocab, counts } = model;
  const denEn = Math.log(totals[0] + alpha * vocab);
  const denTa = Math.log(totals[1] + alpha * vocab);
  let score = 0;
  for (const f of charNgrams(word, model.maxN)) {
    const c = counts[f];
    if (!c) continue;
    score += Math.log(c[1] + alpha) - denTa - (Math.log(c[0] + alpha) - denEn);
  }
  return score;
}
