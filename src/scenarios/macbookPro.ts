import { Timeline } from "./build";
import type { Scenario } from "./types";

const events = new Timeline()
  .at(0)
  .meetingStart()
  .at(0)
  .join("p_priya", "Priya Nair", "priya.nair@acme.com")
  .cam("p_priya", true)
  .at(22)
  .join("p_cand", "MacBook Pro")
  .cam("p_cand", true)
  .at(30)
  .says(
    "p_priya",
    "Thanks for hopping on. To start, can you walk me through your background and what you're working on right now?",
  )
  .says(
    "p_cand",
    "Sure. I'm a backend engineer and I've spent the last four years on payment systems. At my last role I owned the ledger service that handled around two million transactions a day.",
  )
  .says("p_priya", "Nice. How did you keep that ledger consistent under load?")
  .says(
    "p_cand",
    "We used an append only event log and reconciled balances asynchronously. I implemented idempotency keys so retries never double counted, and I added a nightly job that checked the running totals against the source events.",
  )
  .says("p_priya", "What would you do differently if you rebuilt it today?")
  .says(
    "p_cand",
    "I'd push more of the validation into the database. For example I'd model the rule that a balance can never go negative as a constraint, so a bug in the service can't quietly corrupt state.",
  )
  .says("p_priya", "Good instinct. Do you have any questions for me?")
  .says("p_cand", "Yes, what does the on call rotation look like for the platform team?")
  .build();

export const macbookPro: Scenario = {
  id: "macbook-pro",
  title: 'Candidate joined as "MacBook Pro"',
  challenge: "Candidate joins under a device name",
  summary:
    "The display name is a device label, so name and roster matching produce nothing for the candidate. The call has to be made from conversation role and speaking pattern.",
  context: {
    title: "Backend Engineer, second round",
    scheduledStart: 0,
    candidateName: "Aditya Rao",
    candidateEmail: "aditya.rao@gmail.com",
    interviewers: [{ name: "Priya Nair", email: "priya.nair@acme.com" }],
  },
  events,
  groundTruthCandidateId: "p_cand",
};
