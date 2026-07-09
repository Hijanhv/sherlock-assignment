import type { Scenario } from "./types";
import { macbookPro } from "./macbookPro";
import { nickname } from "./nickname";
import { wrongName } from "./wrongName";
import { multiInterviewer } from "./multiInterviewer";
import { nameChange } from "./nameChange";
import { silentObservers } from "./silentObservers";

export type { Scenario } from "./types";

export const SCENARIOS: Scenario[] = [
  macbookPro,
  nickname,
  wrongName,
  multiInterviewer,
  nameChange,
  silentObservers,
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
