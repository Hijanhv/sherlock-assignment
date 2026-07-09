// Turns the current belief into a short, human-readable justification.
//
// The text is composed deterministically from the same numbers the UI shows, so
// the explanation can never disagree with the score. When an Anthropic key is
// present the API layer can rewrite this into a smoother paragraph, but the
// factual content comes from here.

import type { DecisionState, Evidence, MeetingContext, ParticipantBelief } from "./types";

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function fmt(x: number): string {
  const s = x >= 0 ? "+" : "";
  return `${s}${x.toFixed(1)}`;
}

function topPositives(evidence: Evidence[], n: number): Evidence[] {
  return evidence.filter((e) => e.contribution > 0.05).slice(0, n);
}

function topNegative(evidence: Evidence[]): Evidence | undefined {
  return [...evidence].sort((a, b) => a.contribution - b.contribution)[0];
}

export function explain(
  context: MeetingContext,
  beliefs: ParticipantBelief[],
  unknownMass: number,
  state: DecisionState,
): string {
  if (beliefs.length === 0) {
    return "No participants have joined yet.";
  }

  const leader = beliefs[0];
  const runner = beliefs[1];

  if (state === "insufficient") {
    return (
      `Not enough evidence to name the candidate yet. ` +
      `The strongest so far is ${leader.displayName} at ${pct(leader.probability)}, ` +
      `with ${pct(unknownMass)} of belief still on "unknown". Continuing to watch the transcript and audio.`
    );
  }

  if (state === "ambiguous" && runner) {
    const lead = topPositives(leader.evidence, 2)
      .map((e) => e.rationale)
      .join("; ");
    const alt = topPositives(runner.evidence, 2)
      .map((e) => e.rationale)
      .join("; ");
    return (
      `Two participants are close and cannot be separated yet: ` +
      `${leader.displayName} at ${pct(leader.probability)} and ${runner.displayName} at ${pct(runner.probability)}. ` +
      `${leader.displayName} leads because it ${lead || "has slightly stronger signals"}. ` +
      `${runner.displayName} stays in contention because it ${alt || "has comparable signals"}. ` +
      `Holding until one pulls ahead rather than guessing.`
    );
  }

  const verb = state === "confident" ? "Identified" : "Leaning toward";
  const positives = topPositives(leader.evidence, 3);
  const reasons =
    positives.length > 0
      ? positives.map((e) => `${e.rationale} (${fmt(e.contribution)})`).join("; ")
      : "an accumulation of weak signals";

  let text = `${verb} ${leader.displayName} as the candidate at ${pct(leader.probability)} confidence. Reasons: ${reasons}.`;

  // Call out a signal that deliberately stayed neutral, since that is often the
  // point (for example a device display name).
  const neutralIdentity = leader.evidence.find(
    (e) => e.signalId === "identity" && Math.abs(e.contribution) < 0.05,
  );
  if (neutralIdentity) {
    text += ` The name itself was not used: ${neutralIdentity.rationale}.`;
  }

  // Note the strongest reason a runner-up was pushed down, when relevant.
  if (runner) {
    const neg = topNegative(runner.evidence);
    if (neg && neg.contribution < -0.3) {
      text += ` The nearest alternative, ${runner.displayName} (${pct(runner.probability)}), is held back because it ${neg.rationale}.`;
    } else {
      text += ` Nearest alternative is ${runner.displayName} at ${pct(runner.probability)}.`;
    }
  }

  return text;
}
