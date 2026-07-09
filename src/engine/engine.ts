// The identification engine.
//
// Feed it meeting events in order with process(). After each event it returns a
// full Belief snapshot: the posterior over participants, the decision state, and
// an explanation. State is plain data, so a snapshot can be serialized, stored,
// or streamed to a browser without change.

import { decide } from "./decision";
import { explain } from "./explain";
import { emptyBelief, fuse } from "./fusion";
import { buildSignals, type Labeler } from "./signals";
import { ruleClassify } from "./signals/conversationRole";
import type {
  Belief,
  Evidence,
  MeetingContext,
  MeetingEvent,
  ParticipantState,
  Signal,
  SignalId,
  SignalWeights,
} from "./types";

export interface EngineOptions {
  weights?: SignalWeights;
  /** Utterance labeler for the conversation-role signal. Defaults to rules. */
  labeler?: Labeler;
}

export class IdentificationEngine {
  private readonly context: MeetingContext;
  private readonly signals: Signal[];
  private readonly weights: SignalWeights;
  private readonly participants = new Map<string, ParticipantState>();
  private lastT = 0;

  constructor(context: MeetingContext, options: EngineOptions = {}) {
    this.context = context;
    this.signals = buildSignals(options.labeler ?? ruleClassify);
    this.weights = { ...defaultWeights(this.signals), ...(options.weights ?? {}) };
  }

  /** Apply one event and return the resulting belief snapshot. */
  process(event: MeetingEvent): Belief {
    this.ingest(event);
    this.lastT = event.t;
    return this.snapshot(event.t);
  }

  /** Current belief without applying a new event. */
  snapshot(t: number = this.lastT): Belief {
    const participants = this.materialize(t);
    if (participants.filter((p) => p.present).length === 0) {
      return emptyBelief(t);
    }

    const input = { t, context: this.context, participants };
    const evidenceBySignal = new Map<SignalId, Evidence[]>();
    for (const signal of this.signals) {
      evidenceBySignal.set(signal.id, signal.score(input));
    }

    const { beliefs, unknownMass } = fuse(participants, evidenceBySignal, this.weights);
    const { state, leaderId } = decide(beliefs, unknownMass);
    const explanation = explain(this.context, beliefs, unknownMass, state);

    return { t, unknownMass, beliefs, decision: state, leaderId, explanation };
  }

  getContext(): MeetingContext {
    return this.context;
  }

  getWeights(): SignalWeights {
    return this.weights;
  }

  private getOrCreate(id: string, displayName: string): ParticipantState {
    let p = this.participants.get(id);
    if (!p) {
      p = {
        id,
        displayName,
        nameHistory: [displayName],
        present: false,
        webcamOn: false,
        screenSharing: false,
        speaking: false,
        totalSpeakingSec: 0,
        speakingTurns: 0,
        longestTurnSec: 0,
        utterances: [],
      };
      this.participants.set(id, p);
    }
    return p;
  }

  private ingest(event: MeetingEvent): void {
    switch (event.kind) {
      case "meeting_start":
        break;
      case "participant_join": {
        const p = this.getOrCreate(event.participantId, event.displayName);
        p.present = true;
        p.displayName = event.displayName;
        if (event.email) p.email = event.email;
        if (p.joinedAt === undefined) p.joinedAt = event.t;
        break;
      }
      case "participant_leave": {
        const p = this.participants.get(event.participantId);
        if (p) {
          this.closeTurn(p, event.t);
          p.present = false;
          p.speaking = false;
        }
        break;
      }
      case "display_name_change": {
        const p = this.getOrCreate(event.participantId, event.displayName);
        p.displayName = event.displayName;
        if (p.nameHistory[p.nameHistory.length - 1] !== event.displayName) {
          p.nameHistory.push(event.displayName);
        }
        break;
      }
      case "webcam": {
        const p = this.getOrCreate(event.participantId, event.participantId);
        p.webcamOn = event.on;
        break;
      }
      case "screenshare": {
        const p = this.getOrCreate(event.participantId, event.participantId);
        p.screenSharing = event.on;
        break;
      }
      case "speaking": {
        const p = this.getOrCreate(event.participantId, event.participantId);
        if (event.on) {
          if (!p.speaking) {
            p.speaking = true;
            p.speakingSince = event.t;
            p.speakingTurns++;
          }
        } else {
          this.closeTurn(p, event.t);
        }
        break;
      }
      case "transcript": {
        const p = this.getOrCreate(event.participantId, event.participantId);
        const text = event.text.trim();
        if (text) p.utterances.push(text);
        break;
      }
    }
  }

  private closeTurn(p: ParticipantState, t: number): void {
    if (p.speaking && p.speakingSince !== undefined) {
      const dur = Math.max(0, t - p.speakingSince);
      p.totalSpeakingSec += dur;
      p.longestTurnSec = Math.max(p.longestTurnSec, dur);
    }
    p.speaking = false;
    p.speakingSince = undefined;
  }

  /**
   * Snapshot the participant list with any in-progress speaking turn counted up
   * to time t. Returns clones, so signals never mutate live state.
   */
  private materialize(t: number): ParticipantState[] {
    return [...this.participants.values()].map((p) => {
      const clone: ParticipantState = { ...p, utterances: [...p.utterances], nameHistory: [...p.nameHistory] };
      if (p.speaking && p.speakingSince !== undefined) {
        const dur = Math.max(0, t - p.speakingSince);
        clone.totalSpeakingSec += dur;
        clone.longestTurnSec = Math.max(clone.longestTurnSec, dur);
      }
      return clone;
    });
  }
}

function defaultWeights(signals: Signal[]): SignalWeights {
  const w: SignalWeights = {};
  for (const s of signals) w[s.id] = s.defaultWeight;
  return w;
}
