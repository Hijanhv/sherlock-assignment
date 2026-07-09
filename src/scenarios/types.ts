import type { MeetingContext, MeetingEvent } from "../engine/types";

export interface Scenario {
  id: string;
  title: string;
  /** What is hard about this case and what the system has to do about it. */
  summary: string;
  /** The edge case from the brief this maps to. */
  challenge: string;
  context: MeetingContext;
  events: MeetingEvent[];
  /** The participant id that is actually the candidate, for evaluation. */
  groundTruthCandidateId: string;
}
