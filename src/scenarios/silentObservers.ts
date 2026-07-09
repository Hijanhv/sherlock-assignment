import { Timeline } from "./build";
import type { Scenario } from "./types";

// Two extra participants join and stay silent. One has their camera off (a
// note-taker), one keeps it on (a hiring manager observing). Neither speaks, so
// speaking dynamics and presence push both down while the candidate answers.
const events = new Timeline()
  .at(0)
  .meetingStart()
  .at(0)
  .join("p_priya", "Priya Nair", "priya.nair@acme.com")
  .cam("p_priya", true)
  .at(6)
  .join("p_note", "Notetaker", "notes@acme.com")
  .cam("p_note", false)
  .at(10)
  .join("p_mgr", "Jordan Lee")
  .cam("p_mgr", true)
  .at(20)
  .join("p_cand", "Aditya Rao")
  .cam("p_cand", true)
  .at(30)
  .says("p_priya", "Thanks for joining. A couple of people are here just to observe. Can you introduce yourself?")
  .says(
    "p_cand",
    "Sure. I'm a backend engineer with about six years of experience, mostly on high throughput APIs. Lately I've been working on a rate limiting service that protects our public endpoints.",
  )
  .says("p_priya", "How does that rate limiter stay accurate across many servers?")
  .says(
    "p_cand",
    "I used a sliding window counter in Redis with atomic Lua scripts, so every server sees the same count. To keep it fast I also kept a short lived local cache and only synced deltas.",
  )
  .says("p_priya", "What happens if Redis is unavailable?")
  .says(
    "p_cand",
    "It fails open on purpose. I'd rather let a little extra traffic through than block real users because of an infra blip, and I log every time that happens so we can see it.",
  )
  .says("p_priya", "Makes sense. Do you have questions for us?")
  .says("p_cand", "Yes, how does the team balance new features against reliability work?")
  .build();

export const silentObservers: Scenario = {
  id: "silent-observers",
  title: "Two silent observers in the room",
  challenge: "Multiple observers join silently",
  summary:
    "A note-taker with camera off and a manager with camera on both stay silent. Camera state alone is not enough, so sustained silence and the absence of a conversational role rule them out.",
  context: {
    title: "Backend Engineer, final round",
    scheduledStart: 0,
    candidateName: "Aditya Rao",
    candidateEmail: "aditya.rao@gmail.com",
    interviewers: [{ name: "Priya Nair", email: "priya.nair@acme.com" }],
  },
  events,
  groundTruthCandidateId: "p_cand",
};
