// Client-side helper: fetch LLM utterance labels once for a scenario and wrap
// them in a synchronous labeler the engine can use. Falls back to the rule
// classifier whenever the upgrade is unavailable, so the engine never blocks.

import { ruleClassify, type Labeler, type UtteranceLabel } from "@/engine/signals/conversationRole";

export async function buildLlmLabeler(
  utterances: string[],
): Promise<{ labeler: Labeler; available: boolean }> {
  try {
    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ utterances }),
    });
    const data = (await res.json()) as { available?: boolean; labels?: UtteranceLabel[] };
    if (!data.available || !Array.isArray(data.labels) || data.labels.length !== utterances.length) {
      return { labeler: ruleClassify, available: false };
    }
    const map = new Map<string, UtteranceLabel>();
    utterances.forEach((u, i) => map.set(u.trim(), data.labels![i]));
    const labeler: Labeler = (text) => map.get(text.trim()) ?? ruleClassify(text);
    return { labeler, available: true };
  } catch {
    return { labeler: ruleClassify, available: false };
  }
}
