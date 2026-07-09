import type { Signal } from "../types";
import { identitySignal } from "./identity";
import { rosterSignal } from "./roster";
import { createConversationRoleSignal, ruleClassify, type Labeler } from "./conversationRole";
import { speakingDynamicsSignal } from "./speakingDynamics";
import { presenceSignal } from "./presence";

export { ruleClassify };
export type { Labeler };

/**
 * The full signal set. Pass a labeler to swap the rule-based utterance
 * classifier for an LLM-backed one; everything else is unchanged.
 */
export function buildSignals(labeler: Labeler = ruleClassify): Signal[] {
  return [
    identitySignal,
    rosterSignal,
    createConversationRoleSignal(labeler),
    speakingDynamicsSignal,
    presenceSignal,
  ];
}

export const SIGNAL_LABELS: Record<string, string> = {
  identity: "Name / identity match",
  roster: "Calendar roster match",
  conversation_role: "Conversation role",
  speaking_dynamics: "Speaking dynamics",
  presence: "Presence & behavior",
};
