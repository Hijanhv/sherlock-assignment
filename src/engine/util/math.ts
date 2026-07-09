// Small numeric helpers used by the fusion layer. Kept dependency-free so the
// engine runs unchanged in the browser and in Node.

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/** Logistic sigmoid. Maps a log-odds value to a probability in (0, 1). */
export function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

/**
 * Numerically stable softmax over an array of scores.
 * Subtracting the max avoids overflow when scores are large.
 */
export function softmax(scores: number[]): number[] {
  if (scores.length === 0) return [];
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Shannon entropy of a probability distribution, in bits. */
export function entropyBits(probs: number[]): number {
  let h = 0;
  for (const p of probs) {
    if (p > 0) h -= p * Math.log2(p);
  }
  return h;
}

/** Round to a fixed number of decimals without floating-point noise in output. */
export function round(x: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(x * f) / f;
}
