import { test } from "node:test";
import assert from "node:assert/strict";

import { IdentificationEngine } from "../src/engine/engine";
import { SCENARIOS, getScenario, type Scenario } from "../src/scenarios";
import type { Belief } from "../src/engine/types";
import { ruleClassify } from "../src/engine/signals/conversationRole";
import { nameSimilarity, looksLikeDeviceName } from "../src/engine/util/text";
import { softmax } from "../src/engine/util/math";

function runToEnd(scenario: Scenario): Belief {
  const engine = new IdentificationEngine(scenario.context);
  let belief = engine.snapshot(0);
  for (const event of scenario.events) belief = engine.process(event);
  return belief;
}

test("every scenario ends by identifying the true candidate", () => {
  for (const scenario of SCENARIOS) {
    const belief = runToEnd(scenario);
    assert.equal(
      belief.leaderId,
      scenario.groundTruthCandidateId,
      `${scenario.id}: leader should be the true candidate`,
    );
    assert.ok(
      belief.decision === "confident" || belief.decision === "leaning",
      `${scenario.id}: should reach an actionable decision, got ${belief.decision}`,
    );
  }
});

test("device and placeholder names are detected", () => {
  assert.equal(looksLikeDeviceName("MacBook Pro"), true);
  assert.equal(looksLikeDeviceName("iPhone"), true);
  assert.equal(looksLikeDeviceName("Guest 2"), true);
  assert.equal(looksLikeDeviceName("Aditya's iPad"), true);
  assert.equal(looksLikeDeviceName("Priya Nair"), false);
});

test("name similarity handles nicknames and reordering", () => {
  assert.ok(nameSimilarity("Jon", "Jonathan Decker") > 0.6);
  assert.ok(nameSimilarity("Decker, Jonathan", "Jonathan Decker") > 0.9);
  // Unrelated names fall below the identity ramp floor (0.55), so identity
  // stays neutral rather than producing spurious support.
  assert.ok(nameSimilarity("Aditya Rao", "Sarah Kim") < 0.55);
});

test("rule classifier separates questions from answers", () => {
  assert.equal(ruleClassify("Can you walk me through your background?").label, "ask");
  assert.equal(ruleClassify("Why did you choose that approach?").label, "ask");
  assert.equal(
    ruleClassify(
      "I built the ledger service and I implemented idempotency keys so retries never double counted.",
    ).label,
    "answer",
  );
  assert.equal(ruleClassify("yeah").label, "neutral");
});

test("early in the meeting the engine stays uncertain", () => {
  const scenario = getScenario("macbook-pro")!;
  const engine = new IdentificationEngine(scenario.context);
  // Process only the joins and camera events (before any speech).
  const early = scenario.events.filter((e) => e.t <= 25);
  let belief = engine.snapshot(0);
  for (const e of early) belief = engine.process(e);
  assert.equal(belief.decision, "insufficient", "should not commit before hearing anyone");
});

test("a device-named candidate is still identified from behavior", () => {
  const scenario = getScenario("macbook-pro")!;
  const belief = runToEnd(scenario);
  const leader = belief.beliefs.find((b) => b.participantId === belief.leaderId)!;
  const identity = leader.evidence.find((e) => e.signalId === "identity")!;
  assert.equal(identity.contribution, 0, "identity should contribute nothing for a device name");
  assert.ok(leader.probability > 0.6, "behavior alone should still produce confidence");
});

test("wrong metadata does not derail identification", () => {
  const scenario = getScenario("wrong-name")!;
  const belief = runToEnd(scenario);
  assert.equal(belief.leaderId, scenario.groundTruthCandidateId);
});

test("silent observers are pushed to the bottom", () => {
  const scenario = getScenario("silent-observers")!;
  const belief = runToEnd(scenario);
  const observers = ["p_note", "p_mgr"];
  for (const id of observers) {
    const b = belief.beliefs.find((x) => x.participantId === id);
    assert.ok(b, `observer ${id} should be present`);
    assert.ok(b!.probability < 0.1, `observer ${id} should have low probability`);
  }
});

test("confidence holds through a mid-call rename", () => {
  const scenario = getScenario("name-change")!;
  const engine = new IdentificationEngine(scenario.context);
  let beforeRename = 0;
  let afterRename = 0;
  for (const event of scenario.events) {
    const b = engine.process(event);
    const leader = b.beliefs.find((x) => x.participantId === scenario.groundTruthCandidateId);
    if (event.kind === "display_name_change") {
      beforeRename = leader?.probability ?? 0;
    } else if (beforeRename > 0 && afterRename === 0 && event.t > 74) {
      afterRename = leader?.probability ?? 0;
    }
  }
  assert.ok(beforeRename > 0.5, "should be confident before the rename");
  assert.ok(afterRename > beforeRename - 0.2, "rename should not collapse confidence");
});

test("softmax is a valid distribution", () => {
  const p = softmax([2, 1, 0, -1]);
  const sum = p.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.ok(p[0] > p[1] && p[1] > p[2]);
});
