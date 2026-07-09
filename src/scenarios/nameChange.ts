import { Timeline } from "./build";
import type { Scenario } from "./types";

// The candidate starts with a name that matches the invite, then renames to
// initials halfway through. Identity support drops at the rename, but the
// behavioral signals do not reset, so the decision should stay stable.
const events = new Timeline()
  .at(0)
  .meetingStart()
  .at(0)
  .join("p_nadia", "Nadia Cole", "nadia.cole@acme.com")
  .cam("p_nadia", true)
  .at(16)
  .join("p_cand", "Alex Rivera")
  .cam("p_cand", true)
  .at(26)
  .says("p_nadia", "Hi Alex. Let's start simple, what are you most proud of building?")
  .says(
    "p_cand",
    "I'm proud of the search system I built at my last job. It served autocomplete for tens of millions of users, and I got the p99 latency under thirty milliseconds by precomputing the hot prefixes.",
  )
  .says("p_nadia", "How did you decide what to precompute?")
  .says(
    "p_cand",
    "I logged real query prefixes and found the traffic was very skewed, so a small cache covered most of it. I refreshed that cache in the background from the previous day's logs.",
  )
  // Candidate renames to initials mid-interview.
  .at(70)
  .rename("p_cand", "AR")
  .at(74)
  .says("p_nadia", "How did you keep the results fresh when the catalog changed?")
  .says(
    "p_cand",
    "New items went into a fast incremental index within seconds, and the precomputed layer caught up in the next refresh. So new products were searchable immediately even if they weren't ranked perfectly yet.",
  )
  .says("p_nadia", "Nice. What would you improve if you had another quarter?")
  .says(
    "p_cand",
    "I'd personalize the ranking. Right now it's the same for everyone, and I think using a bit of session history would meaningfully improve the top results.",
  )
  .build();

export const nameChange: Scenario = {
  id: "name-change",
  title: "Candidate renames themselves mid-interview",
  challenge: "Candidate changes their display name",
  summary:
    "The candidate starts as a full name that matches the invite, then switches to initials. The confidence should hold steady through the rename because behavior, not the name, is carrying the decision by then.",
  context: {
    title: "Search Engineer, first round",
    scheduledStart: 0,
    candidateName: "Alex Rivera",
    candidateEmail: "alex.rivera@gmail.com",
    interviewers: [{ name: "Nadia Cole", email: "nadia.cole@acme.com" }],
  },
  events,
  groundTruthCandidateId: "p_cand",
};
