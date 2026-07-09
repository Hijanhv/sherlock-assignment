import { Timeline } from "./build";
import type { Scenario } from "./types";

const events = new Timeline()
  .at(0)
  .meetingStart()
  .at(0)
  .join("p_marcus", "Marcus Feld", "marcus.feld@acme.com")
  .cam("p_marcus", true)
  .at(15)
  .join("p_cand", "Jon")
  .cam("p_cand", true)
  .at(25)
  .says("p_marcus", "Hi Jon, thanks for making the time. Tell me a bit about your experience with data pipelines.")
  .says(
    "p_cand",
    "Happy to. I've been a data engineer for about five years. Most recently I rebuilt our batch pipeline into a streaming one on Kafka and Flink, which cut our reporting delay from hours down to under a minute.",
  )
  .says("p_marcus", "What was the hardest part of that migration?")
  .says(
    "p_cand",
    "Late arriving data. I handled it with watermarks and a small side buffer so we could correct aggregates without reprocessing the whole day. For example a payment that landed twenty minutes late still ended up in the right window.",
  )
  .says("p_marcus", "How did you test that it was correct?")
  .says(
    "p_cand",
    "I ran the old batch job and the new streaming job in parallel for two weeks and diffed the outputs. When they disagreed I traced it back, and every case turned out to be the batch job being wrong about time zones.",
  )
  .says("p_marcus", "That's a great answer. Anything you want to ask me?")
  .says("p_cand", "How large is the data team today, and how is it structured?")
  .build();

export const nickname: Scenario = {
  id: "nickname",
  title: 'Candidate joined as "Jon"',
  challenge: "Candidate uses a short-form nickname",
  summary:
    "The nickname partially matches the full candidate name, so identity gives weak positive support. Conversation role confirms it, and the two agree.",
  context: {
    title: "Data Engineer, technical screen",
    scheduledStart: 0,
    candidateName: "Jonathan Decker",
    candidateEmail: "jdecker@fastmail.com",
    interviewers: [{ name: "Marcus Feld", email: "marcus.feld@acme.com" }],
  },
  events,
  groundTruthCandidateId: "p_cand",
};
