// Presence signal: weak behavioral cues from webcam, join time, and screen share.
//
// None of these are decisive on their own, which is the point of fusing many
// weak signals. Candidates usually keep their camera on when interviewed and
// join around the scheduled time; a camera-off, silent participant looks like an
// observer. Screen share is only a faint positive because interviewers share too.

import type { Evidence, Signal, SignalInput } from "../types";
import { clamp } from "../util/math";

const MAX_PRESENCE = 1.2;

export const presenceSignal: Signal = {
  id: "presence",
  label: "Presence & behavior",
  defaultWeight: 0.6,

  score(input: SignalInput): Evidence[] {
    const { context } = input;
    const hasSchedule = Number.isFinite(context.scheduledStart);

    return input.participants.map((p) => {
      if (!p.present) {
        return {
          signalId: "presence" as const,
          contribution: 0,
          confidence: 0.1,
          rationale: "participant has left the meeting",
        };
      }

      const silent = p.totalSpeakingSec < 1.5;
      const notes: string[] = [];
      let score = 0;

      if (p.webcamOn) {
        score += 0.35;
        notes.push("camera on");
      } else if (silent) {
        score -= 0.35;
        notes.push("camera off and silent");
      } else {
        score -= 0.1;
        notes.push("camera off");
      }

      if (hasSchedule && p.joinedAt !== undefined) {
        const delta = p.joinedAt - context.scheduledStart;
        if (delta >= -30 && delta <= 300) {
          score += 0.2;
          notes.push("joined around the scheduled start");
        } else if (delta < -120) {
          score -= 0.2;
          notes.push("joined well before start, more typical of a host");
        }
      }

      if (p.screenSharing) {
        score += 0.15;
        notes.push("sharing screen");
      }

      const contribution = clamp(score, -MAX_PRESENCE, MAX_PRESENCE);

      return {
        signalId: "presence" as const,
        contribution,
        confidence: 0.45,
        rationale: notes.join(", ") || "no notable presence cues",
        features: {
          webcamOn: p.webcamOn,
          screenSharing: p.screenSharing,
        },
      };
    });
  },
};
