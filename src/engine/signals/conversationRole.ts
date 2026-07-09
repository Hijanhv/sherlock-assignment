// Conversation-role signal: interviewers mostly ask, candidates mostly answer.
//
// This is the most naming-robust signal we have. It works off what people say,
// not what they are called, so it survives device names, nicknames, wrong
// metadata, and mid-call renames.
//
// Each utterance is labeled ask / answer / neutral. The default labeler is a
// deterministic rule model (no API key required). The engine can inject an
// LLM-backed labeler that overrides the rules per utterance; the aggregation
// below is identical either way.

import type { Evidence, Signal, SignalInput } from "../types";

export type RoleLabel = "ask" | "answer" | "neutral";
export interface UtteranceLabel {
  label: RoleLabel;
  strength: number; // 0..1 confidence in the label
}

const ASK_OPENERS = [
  "what",
  "why",
  "how",
  "when",
  "where",
  "who",
  "which",
  "can you",
  "could you",
  "would you",
  "do you",
  "did you",
  "have you",
  "are you",
  "tell me",
  "walk me",
  "describe",
  "explain",
  "let's",
  "lets",
  "give me an example",
  "talk me through",
  "what's your",
  "whats your",
];

const ANSWER_CUES = [
  "i ",
  "i'm",
  "im ",
  "my ",
  "we ",
  "in my",
  "at my",
  "for example",
  "i built",
  "i worked",
  "i implemented",
  "i designed",
  "i led",
  "i think",
  "so basically",
  "the way i",
  "what i did",
];

const BACKCHANNEL = new Set([
  "yeah",
  "yes",
  "right",
  "sure",
  "ok",
  "okay",
  "got it",
  "makes sense",
  "exactly",
  "mm hmm",
  "mhm",
  "cool",
  "great",
  "thanks",
  "thank you",
]);

const MAX_ROLE = 2.6;

/** Deterministic, dependency-free utterance classifier. */
export function ruleClassify(text: string): UtteranceLabel {
  const t = text.trim().toLowerCase();
  if (!t) return { label: "neutral", strength: 0 };

  const words = t.split(/\s+/);
  if (words.length <= 3 && BACKCHANNEL.has(t.replace(/[.?!]/g, ""))) {
    return { label: "neutral", strength: 0.6 };
  }

  const endsQuestion = /\?\s*$/.test(text.trim());
  const opensAsk = ASK_OPENERS.some((o) => t.startsWith(o) || t.includes(" " + o));
  const answerHits = ANSWER_CUES.filter((c) => t.startsWith(c) || t.includes(" " + c)).length;
  const long = words.length >= 18;

  let askScore = 0;
  if (endsQuestion) askScore += 0.6;
  if (opensAsk) askScore += 0.5;

  let answerScore = 0;
  answerScore += Math.min(0.6, answerHits * 0.25);
  if (long) answerScore += 0.4;

  // A long first-person statement that also ends in a question is usually an
  // answer that closes by checking in, so bias toward answer when it is long.
  if (long && answerScore > 0) askScore *= 0.5;

  if (askScore === 0 && answerScore === 0) {
    return { label: "neutral", strength: 0.3 };
  }
  if (askScore >= answerScore) {
    return { label: "ask", strength: Math.min(1, askScore) };
  }
  return { label: "answer", strength: Math.min(1, answerScore) };
}

export type Labeler = (text: string) => UtteranceLabel;

export function createConversationRoleSignal(classify: Labeler = ruleClassify): Signal {
  return {
    id: "conversation_role",
    label: "Conversation role (ask vs answer)",
    defaultWeight: 1.2,

    score(input: SignalInput): Evidence[] {
      return input.participants.map((p) => {
        if (p.utterances.length === 0) {
          return {
            signalId: "conversation_role" as const,
            contribution: 0,
            confidence: 0.1,
            rationale: "has not spoken yet, so no conversational role to read",
          };
        }

        let askW = 0;
        let answerW = 0;
        for (const u of p.utterances) {
          const { label, strength } = classify(u);
          if (label === "ask") askW += strength;
          else if (label === "answer") answerW += strength;
        }

        const total = askW + answerW;
        if (total < 0.3) {
          return {
            signalId: "conversation_role" as const,
            contribution: 0,
            confidence: 0.2,
            rationale: "speech so far is mostly acknowledgements, role still unclear",
          };
        }

        const ratio = (answerW - askW) / total; // -1 pure asker .. +1 pure answerer
        const dataConfidence = 1 - Math.exp(-p.utterances.length / 4);
        const contribution = MAX_ROLE * Math.tanh(ratio * 1.6) * dataConfidence;

        const pct = Math.round(((ratio + 1) / 2) * 100);
        let rationale: string;
        if (ratio > 0.25) {
          rationale = `answers far more than asks (${pct}% answering across ${p.utterances.length} turns), which fits a candidate`;
        } else if (ratio < -0.25) {
          rationale = `asks far more than answers (${pct}% answering), which fits an interviewer`;
        } else {
          rationale = `mixes asking and answering (${pct}% answering), an unclear role`;
        }

        return {
          signalId: "conversation_role" as const,
          contribution,
          confidence: dataConfidence,
          rationale,
          features: {
            answering: `${pct}%`,
            turns: p.utterances.length,
          },
        };
      });
    },
  };
}

export const conversationRoleSignal = createConversationRoleSignal();
