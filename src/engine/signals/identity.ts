// Identity signal: does the display name look like the candidate's name?
//
// This is confirmatory only. A strong match is positive evidence; a weak match
// is *not* evidence against, because candidates routinely join under nicknames,
// device labels, or handles unrelated to their legal name. Device/placeholder
// labels ("MacBook Pro", "Guest 2") carry no information and the signal abstains.

import type { Evidence, Signal, SignalInput } from "../types";
import { nameSimilarity, emailLocalPart, looksLikeDeviceName } from "../util/text";
import { clamp } from "../util/math";

const MAX_POS = 2.4;

function ramp(x: number, a: number, b: number): number {
  if (x <= a) return 0;
  if (x >= b) return 1;
  const t = (x - a) / (b - a);
  return t * t * (3 - 2 * t);
}

export const identitySignal: Signal = {
  id: "identity",
  label: "Name / identity match",
  defaultWeight: 1.0,

  score(input: SignalInput): Evidence[] {
    const { context, participants } = input;
    const candidateName = context.candidateName?.trim();
    const candidateEmailLocal = emailLocalPart(context.candidateEmail);

    return participants.map((p) => {
      if (!p.present) {
        return zero(p.displayName, "participant has left the meeting");
      }

      if (looksLikeDeviceName(p.displayName)) {
        return {
          signalId: "identity" as const,
          contribution: 0,
          confidence: 0.2,
          rationale: `"${p.displayName}" is a device or placeholder label, so the name gives no identity signal`,
          features: { displayName: p.displayName, deviceLabel: true },
        };
      }

      if (!candidateName && !candidateEmailLocal) {
        return zero(p.displayName, "no candidate name on the invite to match against");
      }

      const simName = candidateName ? nameSimilarity(p.displayName, candidateName) : 0;
      const simEmail = candidateEmailLocal
        ? nameSimilarity(p.displayName, candidateEmailLocal)
        : 0;
      const sim = Math.max(simName, simEmail);

      const contribution = clamp(MAX_POS * ramp(sim, 0.55, 0.9), 0, MAX_POS);
      const matched = simName >= simEmail ? candidateName : context.candidateEmail;

      let rationale: string;
      if (sim >= 0.9) {
        rationale = `display name closely matches the invited candidate (${matched})`;
      } else if (sim >= 0.7) {
        rationale = `display name partially matches the candidate (${matched}); likely a short form`;
      } else {
        rationale = `display name does not resemble the candidate name, which on its own is inconclusive`;
      }

      return {
        signalId: "identity" as const,
        contribution,
        confidence: clamp(sim, 0.2, 0.95),
        rationale,
        features: {
          displayName: p.displayName,
          similarity: Number(sim.toFixed(2)),
        },
      };
    });
  },
};

function zero(displayName: string, why: string): Evidence {
  return {
    signalId: "identity",
    contribution: 0,
    confidence: 0.1,
    rationale: why,
    features: { displayName },
  };
}
