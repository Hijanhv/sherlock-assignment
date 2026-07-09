import { Timeline } from "./build";
import type { Scenario } from "./types";

// The recruiter pasted the wrong candidate into the invite. The metadata name
// and email match no one in the room. A name-only system would fail here; the
// engine has to notice the metadata is unusable and fall back to behavior.
const events = new Timeline()
  .at(0)
  .meetingStart()
  .at(0)
  .join("p_dana", "Dana Ortiz", "dana.ortiz@acme.com")
  .cam("p_dana", true)
  .at(18)
  .join("p_cand", "Michael Chen")
  .cam("p_cand", true)
  .at(28)
  .says("p_dana", "Welcome. Could you start by describing a system you designed end to end?")
  .says(
    "p_cand",
    "Sure. I designed the notifications platform at my last company. It fanned out email, push and SMS from a single event bus, and I built it to handle roughly ten million sends a day without falling over.",
  )
  .says("p_dana", "How did you handle a downstream provider going down?")
  .says(
    "p_cand",
    "I put a circuit breaker in front of each provider and a retry queue with exponential backoff. If a provider stayed down we automatically failed over to a secondary, and I added alerts so on call knew before customers did.",
  )
  .says("p_dana", "Why did you choose a message bus over direct calls?")
  .says(
    "p_cand",
    "Mostly to decouple producers from consumers. Teams could add new notification types without touching my service, and I could replay events when we shipped a bug. For example we once reprocessed a full day after a template error.",
  )
  .says("p_dana", "Very clear. What questions do you have for me?")
  .says("p_cand", "What does success look like in the first ninety days for this role?")
  .build();

export const wrongName: Scenario = {
  id: "wrong-name",
  title: "Interviewer entered the wrong candidate name",
  challenge: "External metadata is incorrect",
  summary:
    'The invite says the candidate is "Sarah Kim", but no one by that name or email is in the room. The engine cannot trust the metadata and identifies the real candidate from roster exclusion and conversation role.',
  context: {
    title: "Staff Engineer, system design",
    scheduledStart: 0,
    candidateName: "Sarah Kim",
    candidateEmail: "sarah.kim@gmail.com",
    interviewers: [{ name: "Dana Ortiz", email: "dana.ortiz@acme.com" }],
  },
  events,
  groundTruthCandidateId: "p_cand",
};
