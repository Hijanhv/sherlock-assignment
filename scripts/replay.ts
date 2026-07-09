// CLI replay: run a scenario (or all of them) through the engine and print how
// the belief evolves. Useful for eyeballing behavior without the UI.
//
//   npm run replay                 # summary line per scenario
//   npm run replay macbook-pro     # full timeline for one scenario

import { IdentificationEngine } from "../src/engine/engine";
import { SCENARIOS, getScenario, type Scenario } from "../src/scenarios";
import type { Belief } from "../src/engine/types";

function bar(p: number, width = 20): string {
  const filled = Math.round(p * width);
  return "#".repeat(filled) + "-".repeat(width - filled);
}

function finalBelief(scenario: Scenario): Belief {
  const engine = new IdentificationEngine(scenario.context);
  let belief = engine.snapshot(0);
  for (const event of scenario.events) belief = engine.process(event);
  return belief;
}

function printTimeline(scenario: Scenario): void {
  const engine = new IdentificationEngine(scenario.context);
  console.log(`\n=== ${scenario.title} (${scenario.id}) ===`);
  console.log(scenario.summary + "\n");

  let lastState = "";
  for (const event of scenario.events) {
    const b = engine.process(event);
    const leader = b.beliefs[0];
    const line = `${b.decision}|${leader?.participantId ?? "-"}|${Math.round((leader?.probability ?? 0) * 100)}`;
    if (line !== lastState && leader) {
      console.log(
        `t=${String(Math.round(b.t)).padStart(3)}s  ${b.decision.padEnd(12)}  ` +
          `${leader.displayName.padEnd(16)} ${bar(leader.probability)} ${Math.round(leader.probability * 100)}%` +
          `  unknown ${Math.round(b.unknownMass * 100)}%`,
      );
      lastState = line;
    }
  }

  const final = engine.snapshot();
  console.log("\nFinal ranking:");
  for (const belief of final.beliefs) {
    const mark = belief.participantId === scenario.groundTruthCandidateId ? " <- candidate" : "";
    console.log(
      `  ${belief.displayName.padEnd(18)} ${bar(belief.probability)} ${Math.round(belief.probability * 100)}%${mark}`,
    );
  }
  console.log(`  unknown mass: ${Math.round(final.unknownMass * 100)}%`);
  console.log(`\nExplanation: ${final.explanation}`);
}

function printSummary(): void {
  let correct = 0;
  console.log("Scenario evaluation (final decision vs ground truth):\n");
  for (const scenario of SCENARIOS) {
    const b = finalBelief(scenario);
    const pickedRight = b.leaderId === scenario.groundTruthCandidateId;
    const identified = b.decision === "confident" || b.decision === "leaning";
    if (pickedRight && identified) correct++;
    const leader = b.beliefs.find((x) => x.participantId === b.leaderId);
    console.log(
      `  ${pickedRight && identified ? "PASS" : "CHECK"}  ${scenario.id.padEnd(18)} ` +
        `${b.decision.padEnd(12)} leader=${leader?.displayName ?? "none"} ` +
        `(${Math.round((leader?.probability ?? 0) * 100)}%)`,
    );
  }
  console.log(`\n${correct}/${SCENARIOS.length} identified correctly.`);
}

const arg = process.argv[2];
if (arg) {
  const scenario = getScenario(arg);
  if (!scenario) {
    console.error(`Unknown scenario "${arg}". Options: ${SCENARIOS.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }
  printTimeline(scenario);
} else {
  printSummary();
}
