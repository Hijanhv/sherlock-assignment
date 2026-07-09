import { Timeline } from "./build";
import type { Scenario } from "./types";

// A panel: three interviewers take turns asking, one candidate answers all of
// them. Roster excludes the three staff emails; conversation role and identity
// converge on the remaining person.
const events = new Timeline()
  .at(0)
  .meetingStart()
  .at(0)
  .join("p_priya", "Priya Nair", "priya.nair@acme.com")
  .cam("p_priya", true)
  .at(5)
  .join("p_tom", "Tom Alvarez", "tom.alvarez@acme.com")
  .cam("p_tom", true)
  .at(9)
  .join("p_rina", "Rina Shah", "rina.shah@acme.com")
  .cam("p_rina", true)
  .at(20)
  .join("p_cand", "Aditya Rao")
  .cam("p_cand", true)
  .at(30)
  .says("p_priya", "Thanks everyone. Aditya, want to give a quick intro of what you do?")
  .says(
    "p_cand",
    "Of course. I'm a backend engineer focused on distributed systems. For the last three years I've worked on the order matching engine at a crypto exchange, which had to stay correct at very high message rates.",
  )
  .says("p_tom", "Tom here. How did you keep latency low in the matching engine?")
  .says(
    "p_cand",
    "I kept the hot path single threaded and lock free, and moved everything else off it. Orders came in on a ring buffer, and I batched the slow work like persistence and market data so it never blocked a match.",
  )
  .says("p_rina", "Rina here. How did you test correctness at that speed?")
  .says(
    "p_cand",
    "I wrote a deterministic simulator that replayed recorded order flow, so any run was reproducible. When we found a bug I could capture the exact sequence and turn it into a regression test.",
  )
  .says("p_priya", "How do you handle a bad deploy in that kind of system?")
  .says(
    "p_cand",
    "We shadowed the new build against live traffic first and compared outputs before it took real orders. If anything diverged we stopped the rollout automatically.",
  )
  .says("p_tom", "Great. We'll leave a few minutes for your questions at the end.")
  .build();

export const multiInterviewer: Scenario = {
  id: "multi-interviewer",
  title: "Panel with three interviewers",
  challenge: "Multiple interviewers are present",
  summary:
    "Three people ask questions and one answers. Roster exclusion removes the three staff emails and conversation role separates the single answerer from the panel.",
  context: {
    title: "Backend Engineer, panel round",
    scheduledStart: 0,
    candidateName: "Aditya Rao",
    candidateEmail: "aditya.rao@gmail.com",
    interviewers: [
      { name: "Priya Nair", email: "priya.nair@acme.com" },
      { name: "Tom Alvarez", email: "tom.alvarez@acme.com" },
      { name: "Rina Shah", email: "rina.shah@acme.com" },
    ],
  },
  events,
  groundTruthCandidateId: "p_cand",
};
