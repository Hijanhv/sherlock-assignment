// Precompute the full belief trajectory for a scenario. Because the engine is
// deterministic, we can replay once and then scrub the timeline instantly in
// the UI without re-running anything.

import { IdentificationEngine } from "@/engine/engine";
import type { Belief, MeetingEvent } from "@/engine/types";
import type { Labeler } from "@/engine/signals";
import type { Scenario } from "@/scenarios";

export interface TimelineStep {
  event: MeetingEvent;
  belief: Belief;
}

export interface ScenarioTimeline {
  initial: Belief;
  steps: TimelineStep[];
}

export function computeTimeline(scenario: Scenario, labeler?: Labeler): ScenarioTimeline {
  const engine = new IdentificationEngine(scenario.context, { labeler });
  const initial = engine.snapshot(0);
  const steps = scenario.events.map((event) => ({ event, belief: engine.process(event) }));
  return { initial, steps };
}

/** Pull the unique spoken utterances of a scenario, for LLM pre-labeling. */
export function scenarioUtterances(scenario: Scenario): string[] {
  const seen = new Set<string>();
  for (const e of scenario.events) {
    if (e.kind === "transcript") seen.add(e.text.trim());
  }
  return [...seen];
}
