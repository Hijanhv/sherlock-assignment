// Roster signal: cross-reference each participant against the calendar invite.
//
// Two independent reads:
//   1. A verified email match to the candidate is the single strongest positive
//      signal we can get, so it dominates.
//   2. Anyone who matches a known interviewer (by email, else by name) is very
//      unlikely to be the candidate, which is strong negative evidence.
//
// The signal abstains for participants it cannot place on the roster.

import type { Evidence, Signal, SignalInput } from "../types";
import { nameSimilarity, looksLikeDeviceName } from "../util/text";

const EMAIL_CANDIDATE = 3.2;
const EMAIL_INTERVIEWER = -3.2;
const NAME_INTERVIEWER = -2.4;

function sameEmail(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export const rosterSignal: Signal = {
  id: "roster",
  label: "Calendar roster match",
  defaultWeight: 1.0,

  score(input: SignalInput): Evidence[] {
    const { context } = input;
    const interviewers = context.interviewers ?? [];

    return input.participants.map((p) => {
      if (!p.present) {
        return abstain("participant has left the meeting");
      }

      // 1. Verified candidate email wins outright.
      if (context.candidateEmail && sameEmail(p.email, context.candidateEmail)) {
        return {
          signalId: "roster" as const,
          contribution: EMAIL_CANDIDATE,
          confidence: 0.98,
          rationale: `email matches the invited candidate address (${context.candidateEmail})`,
          features: { email: p.email ?? "", verified: true },
        };
      }

      // 2. Email match to any interviewer.
      const interviewerByEmail = interviewers.find((iv) => sameEmail(p.email, iv.email));
      if (interviewerByEmail) {
        return {
          signalId: "roster" as const,
          contribution: EMAIL_INTERVIEWER,
          confidence: 0.98,
          rationale: `email matches interviewer ${interviewerByEmail.name} on the invite`,
          features: { email: p.email ?? "", role: "interviewer" },
        };
      }

      // 3. Name match to an interviewer, when no email is available.
      if (!looksLikeDeviceName(p.displayName)) {
        let best = 0;
        let bestName = "";
        for (const iv of interviewers) {
          const s = nameSimilarity(p.displayName, iv.name);
          if (s > best) {
            best = s;
            bestName = iv.name;
          }
        }
        if (best >= 0.82) {
          return {
            signalId: "roster" as const,
            contribution: NAME_INTERVIEWER * best,
            confidence: Math.min(0.9, best),
            rationale: `display name matches interviewer ${bestName} on the invite`,
            features: { matchedInterviewer: bestName, similarity: Number(best.toFixed(2)) },
          };
        }
      }

      return abstain("not found on the invite as candidate or interviewer");
    });
  },
};

function abstain(why: string): Evidence {
  return {
    signalId: "roster",
    contribution: 0,
    confidence: 0.15,
    rationale: why,
  };
}
