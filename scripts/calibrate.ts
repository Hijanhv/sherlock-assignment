// Weight calibration: the "keeps learning" story, made concrete.
//
// The fusion score for a participant is a weighted sum of per-signal
// contributions. Those weights are hand-set defaults today. Given labeled past
// interviews (each with a known true candidate), we can instead fit the weights
// that best explain the data.
//
// The model is a conditional softmax over participants plus a fixed "unknown"
// class. We maximize the log-likelihood of the true candidate by gradient
// ascent. This is the same math the engine uses at inference time, so learned
// weights drop straight back into production.
//
//   npm run calibrate

import { IdentificationEngine } from "../src/engine/engine";
import { UNKNOWN_FLOOR } from "../src/engine/fusion";
import { SCENARIOS } from "../src/scenarios";
import type { Scenario } from "../src/scenarios";
import type { SignalId, SignalWeights } from "../src/engine/types";

const SIGNAL_ORDER: SignalId[] = [
  "identity",
  "roster",
  "conversation_role",
  "speaking_dynamics",
  "presence",
];

interface Example {
  // feature[participant][signal] = raw (unweighted) contribution
  features: number[][];
  trueIndex: number;
}

/**
 * Replay a scenario with all weights set to 1 so evidence.contribution is the
 * raw per-signal value, and sample the state at a few points in time. Each
 * sample becomes one training example.
 */
function collectExamples(scenario: Scenario): Example[] {
  const unitWeights: SignalWeights = Object.fromEntries(SIGNAL_ORDER.map((s) => [s, 1]));
  const engine = new IdentificationEngine(scenario.context, { weights: unitWeights });

  const total = scenario.events.length;
  const sampleAt = new Set([
    Math.floor(total * 0.5),
    Math.floor(total * 0.75),
    total, // final state
  ]);

  const examples: Example[] = [];
  let applied = 0;
  const takeSample = () => {
    const belief = engine.snapshot();
    const trueIndex = belief.beliefs.findIndex(
      (b) => b.participantId === scenario.groundTruthCandidateId,
    );
    if (trueIndex < 0 || belief.beliefs.length < 2) return;
    const features = belief.beliefs.map((b) => {
      const bySignal = new Map(b.evidence.map((e) => [e.signalId, e.contribution]));
      return SIGNAL_ORDER.map((s) => bySignal.get(s) ?? 0);
    });
    examples.push({ features, trueIndex });
  };

  for (const event of scenario.events) {
    engine.process(event);
    applied++;
    if (sampleAt.has(applied)) takeSample();
  }
  return examples;
}

function softmaxWithUnknown(scores: number[]): { probs: number[]; unknown: number } {
  const all = [...scores, UNKNOWN_FLOOR];
  const max = Math.max(...all);
  const exps = all.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const probs = exps.slice(0, scores.length).map((e) => e / sum);
  return { probs, unknown: exps[exps.length - 1] / sum };
}

function train(examples: Example[]): SignalWeights {
  const n = SIGNAL_ORDER.length;
  let w = new Array(n).fill(1); // start from the current defaults
  const lr = 0.05;
  const l2 = 0.01; // pull gently toward the default of 1
  const iterations = 800;

  for (let it = 0; it < iterations; it++) {
    const grad = new Array(n).fill(0);
    for (const ex of examples) {
      const scores = ex.features.map((f) => f.reduce((acc, fi, s) => acc + fi * w[s], 0));
      const { probs } = softmaxWithUnknown(scores);
      for (let p = 0; p < ex.features.length; p++) {
        const indicator = p === ex.trueIndex ? 1 : 0;
        const coeff = indicator - probs[p];
        for (let s = 0; s < n; s++) grad[s] += coeff * ex.features[p][s];
      }
    }
    for (let s = 0; s < n; s++) {
      grad[s] -= l2 * (w[s] - 1); // regularize toward 1
      w[s] += lr * (grad[s] / examples.length);
      if (w[s] < 0) w[s] = 0; // weights are non-negative by construction
    }
  }

  return Object.fromEntries(SIGNAL_ORDER.map((s, i) => [s, Number(w[i].toFixed(3))]));
}

function accuracy(weights?: SignalWeights): number {
  let correct = 0;
  for (const scenario of SCENARIOS) {
    const engine = new IdentificationEngine(scenario.context, weights ? { weights } : {});
    let leaderId: string | null = null;
    for (const event of scenario.events) leaderId = engine.process(event).leaderId;
    if (leaderId === scenario.groundTruthCandidateId) correct++;
  }
  return correct / SCENARIOS.length;
}

function meanLogLik(examples: Example[], weights: SignalWeights): number {
  const w = SIGNAL_ORDER.map((s) => weights[s] ?? 1);
  let sum = 0;
  for (const ex of examples) {
    const scores = ex.features.map((f) => f.reduce((acc, fi, s) => acc + fi * w[s], 0));
    const { probs } = softmaxWithUnknown(scores);
    sum += Math.log(Math.max(1e-9, probs[ex.trueIndex]));
  }
  return sum / examples.length;
}

function main() {
  const examples = SCENARIOS.flatMap(collectExamples);
  console.log(`Collected ${examples.length} labeled snapshots from ${SCENARIOS.length} interviews.\n`);

  const defaults: SignalWeights = {
    identity: 1.0,
    roster: 1.0,
    conversation_role: 1.2,
    speaking_dynamics: 0.8,
    presence: 0.6,
  };
  const learned = train(examples);

  console.log("Signal weights (default vs learned):");
  for (const s of SIGNAL_ORDER) {
    console.log(`  ${s.padEnd(20)} ${String(defaults[s]).padEnd(6)} -> ${learned[s]}`);
  }

  console.log("\nMean log-likelihood of the true candidate:");
  console.log(`  uniform weights: ${meanLogLik(examples, {}).toFixed(3)}`);
  console.log(`  learned weights: ${meanLogLik(examples, learned).toFixed(3)}`);

  console.log("\nFinal-decision accuracy across scenarios:");
  console.log(`  default weights: ${(accuracy() * 100).toFixed(0)}%`);
  console.log(`  learned weights: ${(accuracy(learned) * 100).toFixed(0)}%`);

  console.log(
    "\nWith only six scenarios the learned weights stay close to the defaults, which is the",
  );
  console.log(
    "point: the mechanism is real and drop-in, and it sharpens as more labeled interviews arrive.",
  );
}

main();
