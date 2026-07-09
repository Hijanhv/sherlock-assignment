// Evidence fusion: combine per-signal log-odds into a posterior over "who is
// the candidate".
//
// Each participant's score is a weighted sum of signal contributions (nats).
// We add a constant "unknown" hypothesis so the model can say "no one looks
// like the candidate yet" instead of being forced to pick. A softmax over
// [participant scores..., unknown floor] yields a proper distribution whose
// last entry is the unknown mass.

import type {
  Belief,
  Evidence,
  ParticipantBelief,
  ParticipantState,
  SignalId,
  SignalWeights,
} from "./types";
import { softmax } from "./util/math";

// The unknown hypothesis sits slightly above a no-evidence participant, so a
// meeting with no discriminating evidence resolves to "unknown" rather than a
// coin flip between silent participants.
export const UNKNOWN_FLOOR = 0.5;

export interface FusionResult {
  beliefs: ParticipantBelief[];
  unknownMass: number;
}

export function fuse(
  participants: ParticipantState[],
  evidenceBySignal: Map<SignalId, Evidence[]>,
  weights: SignalWeights,
): FusionResult {
  const present = participants.filter((p) => p.present);

  // Assemble each present participant's weighted score and evidence list.
  // evidenceBySignal arrays are aligned to the full participants array, so we
  // track the original index per participant to read the right entry.
  const indexOf = new Map<string, number>();
  participants.forEach((p, i) => indexOf.set(p.id, i));

  const scored = present.map((p) => {
    const idx = indexOf.get(p.id)!;
    const evidence: Evidence[] = [];
    let score = 0;
    for (const [signalId, arr] of evidenceBySignal) {
      const ev = arr[idx];
      if (!ev) continue;
      const w = weights[signalId] ?? 1;
      const weighted: Evidence = { ...ev, contribution: ev.contribution * w };
      score += weighted.contribution;
      evidence.push(weighted);
    }
    return { participant: p, score, evidence };
  });

  const scores = scored.map((s) => s.score);
  const probs = softmax([...scores, UNKNOWN_FLOOR]);
  const unknownMass = probs[probs.length - 1];

  const beliefs: ParticipantBelief[] = scored.map((s, i) => ({
    participantId: s.participant.id,
    displayName: s.participant.displayName,
    probability: probs[i],
    score: s.score,
    evidence: s.evidence.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
  }));

  beliefs.sort((a, b) => b.probability - a.probability);
  return { beliefs, unknownMass };
}

export function emptyBelief(t: number): Belief {
  return {
    t,
    unknownMass: 1,
    beliefs: [],
    decision: "insufficient",
    leaderId: null,
    explanation: "No participants yet.",
  };
}
