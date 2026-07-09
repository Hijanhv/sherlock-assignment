// Decision policy: turn a posterior into an action, and refuse to guess when
// the evidence does not support a call.
//
// Four states, from weakest to strongest:
//   insufficient - unknown dominates or nothing stands out; keep gathering.
//   ambiguous    - two participants are close; surface both, do not pick one.
//   leaning      - a tentative front-runner, not yet trustworthy.
//   confident    - a clear, well-separated leader.

import type { Belief, DecisionState, ParticipantBelief } from "./types";

export const THRESHOLDS = {
  confidentProb: 0.7,
  confidentMargin: 0.2,
  confidentMaxUnknown: 0.45,
  leaningProb: 0.5,
  leaningMargin: 0.12,
  ambiguousMinProb: 0.35,
};

export function decide(
  beliefs: ParticipantBelief[],
  unknownMass: number,
): { state: DecisionState; leaderId: string | null } {
  if (beliefs.length === 0) {
    return { state: "insufficient", leaderId: null };
  }

  const p1 = beliefs[0].probability;
  const p2 = beliefs[1]?.probability ?? 0;
  const margin = p1 - p2;

  if (
    p1 >= THRESHOLDS.confidentProb &&
    margin >= THRESHOLDS.confidentMargin &&
    unknownMass < THRESHOLDS.confidentMaxUnknown
  ) {
    return { state: "confident", leaderId: beliefs[0].participantId };
  }

  if (p1 >= THRESHOLDS.leaningProb && margin >= THRESHOLDS.leaningMargin) {
    return { state: "leaning", leaderId: beliefs[0].participantId };
  }

  if (p1 >= THRESHOLDS.ambiguousMinProb && margin < THRESHOLDS.leaningMargin) {
    // Two live candidates that we cannot separate yet.
    return { state: "ambiguous", leaderId: beliefs[0].participantId };
  }

  return { state: "insufficient", leaderId: null };
}

export function decisionLabel(state: DecisionState): string {
  switch (state) {
    case "confident":
      return "Candidate identified";
    case "leaning":
      return "Leading candidate";
    case "ambiguous":
      return "Ambiguous, holding";
    case "insufficient":
      return "Gathering evidence";
  }
}

export function isActionable(b: Belief): boolean {
  return b.decision === "confident";
}
