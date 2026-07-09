// Domain model for the candidate-identification engine.
//
// The engine is a stream processor: it consumes meeting events in order, keeps
// per-participant state, and after each event emits a Belief snapshot. Nothing
// here touches the DOM or Node APIs, so the same code runs in the browser
// (demo replay) and on a server (production webhook ingestion).

export interface Person {
  name: string;
  email?: string;
}

/** External context known before or around the meeting. May be incomplete or wrong. */
export interface MeetingContext {
  title: string;
  /** Scheduled start, in seconds on the same clock as event timestamps. */
  scheduledStart: number;
  /** The candidate name from the calendar. Can be misspelled or simply wrong. */
  candidateName?: string;
  candidateEmail?: string;
  /** Known interviewers from the invite. Any of these fields may be missing. */
  interviewers: Person[];
}

export type MeetingEvent =
  | { t: number; kind: "meeting_start" }
  | { t: number; kind: "participant_join"; participantId: string; displayName: string; email?: string }
  | { t: number; kind: "participant_leave"; participantId: string }
  | { t: number; kind: "display_name_change"; participantId: string; displayName: string }
  | { t: number; kind: "webcam"; participantId: string; on: boolean }
  | { t: number; kind: "screenshare"; participantId: string; on: boolean }
  | { t: number; kind: "speaking"; participantId: string; on: boolean }
  | { t: number; kind: "transcript"; participantId: string; text: string };

/** Live per-participant state accumulated from the event stream. */
export interface ParticipantState {
  id: string;
  displayName: string;
  email?: string;
  nameHistory: string[];
  present: boolean;
  webcamOn: boolean;
  screenSharing: boolean;
  joinedAt?: number;
  // speaking
  speaking: boolean;
  speakingSince?: number;
  totalSpeakingSec: number;
  speakingTurns: number;
  longestTurnSec: number;
  // transcript
  utterances: string[];
}

/** One signal's contribution to one participant, in log-odds (nats). */
export interface Evidence {
  signalId: SignalId;
  /** Signed contribution added to the participant's candidate score. */
  contribution: number;
  /** How much the signal trusts its own read, in [0, 1]. For display and gating. */
  confidence: number;
  /** Short human-readable justification for this contribution. */
  rationale: string;
  /** Optional structured features behind the number, surfaced in the UI. */
  features?: Record<string, string | number | boolean>;
}

export type SignalId =
  | "identity"
  | "roster"
  | "conversation_role"
  | "speaking_dynamics"
  | "presence";

/** A signal reads participant state + context and scores every participant. */
export interface Signal {
  id: SignalId;
  label: string;
  /** Default fusion weight. Overridable via calibration. */
  defaultWeight: number;
  score(input: SignalInput): Evidence[];
}

export interface SignalInput {
  t: number;
  context: MeetingContext;
  participants: ParticipantState[];
}

export type DecisionState = "insufficient" | "ambiguous" | "leaning" | "confident";

export interface ParticipantBelief {
  participantId: string;
  displayName: string;
  /** Posterior probability this participant is the candidate. */
  probability: number;
  /** Summed weighted log-odds score before normalization. */
  score: number;
  evidence: Evidence[];
}

export interface Belief {
  t: number;
  /** Probability mass on "candidate not identifiable yet / not present". */
  unknownMass: number;
  beliefs: ParticipantBelief[];
  decision: DecisionState;
  /** The leading participant id, or null when unknown dominates. */
  leaderId: string | null;
  /** Natural-language explanation of the current call. */
  explanation: string;
}

export type SignalWeights = Partial<Record<SignalId, number>>;
