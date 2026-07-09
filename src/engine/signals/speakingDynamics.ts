// Speaking-dynamics signal: how much and how a participant talks.
//
// Candidates tend to hold the floor in long answers; interviewers speak in
// shorter bursts; observers barely speak at all. This signal reads talk-time
// share and monologue length, and flags sustained silence as strong evidence
// against being the candidate once enough of the meeting has elapsed.

import type { Evidence, ParticipantState, Signal, SignalInput } from "../types";

const MAX_DYN = 1.7;
const SILENCE_FLOOR_SEC = 1.5; // below this total, treat as effectively silent
const SILENCE_GRACE_SEC = 45; // do not penalize silence before this much elapsed

export const speakingDynamicsSignal: Signal = {
  id: "speaking_dynamics",
  label: "Speaking dynamics",
  defaultWeight: 0.8,

  score(input: SignalInput): Evidence[] {
    const elapsed = input.t;
    const present = input.participants.filter((p) => p.present);
    const totalAll = present.reduce((a, p) => a + p.totalSpeakingSec, 0);
    const talkers = present.filter((p) => p.totalSpeakingSec > SILENCE_FLOOR_SEC).length;
    const avgShare = 1 / Math.max(1, talkers);

    return input.participants.map((p) => {
      if (!p.present) {
        return abstain("participant has left the meeting");
      }

      // Sustained silence: a strong exclusion once the meeting is underway.
      if (p.totalSpeakingSec < SILENCE_FLOOR_SEC) {
        if (elapsed < SILENCE_GRACE_SEC) {
          return {
            signalId: "speaking_dynamics" as const,
            contribution: 0,
            confidence: 0.2,
            rationale: "has not spoken yet, but the meeting just started",
          };
        }
        const conf = Math.min(0.9, (elapsed - SILENCE_GRACE_SEC) / 120 + 0.4);
        return {
          signalId: "speaking_dynamics" as const,
          contribution: -1.7 * conf,
          confidence: conf,
          rationale: `silent for the first ${Math.round(elapsed)}s, which fits an observer, not the candidate`,
          features: { speakingSec: Math.round(p.totalSpeakingSec), silent: true },
        };
      }

      const share = totalAll > 0 ? p.totalSpeakingSec / totalAll : 0;
      const shareScore = Math.tanh((share - avgShare) * 3);
      const monologueScore = Math.tanh(p.longestTurnSec / 30);
      const dataConf = Math.min(0.9, totalAll / 60);

      const contribution = MAX_DYN * (0.7 * shareScore + 0.3 * monologueScore) * dataConf;

      return {
        signalId: "speaking_dynamics" as const,
        contribution,
        confidence: dataConf,
        rationale: describe(p, share),
        features: {
          talkSharePct: Math.round(share * 100),
          longestTurnSec: Math.round(p.longestTurnSec),
        },
      };
    });
  },
};

function describe(p: ParticipantState, share: number): string {
  const pct = Math.round(share * 100);
  if (share > 0.4 && p.longestTurnSec > 15) {
    return `holds the floor in long answers (${pct}% of talk time, longest turn ${Math.round(p.longestTurnSec)}s)`;
  }
  if (pct <= 15) {
    return `speaks in short bursts (${pct}% of talk time), more typical of an interviewer`;
  }
  return `moderate share of talk time (${pct}%)`;
}

function abstain(why: string): Evidence {
  return {
    signalId: "speaking_dynamics",
    contribution: 0,
    confidence: 0.15,
    rationale: why,
  };
}
