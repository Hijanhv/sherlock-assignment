# Sherlock: real-time interview candidate identification

Sherlock's fraud detectors (deepfake, voice cloning, behavioral analysis) have to
analyze the candidate's audio and video, not the interviewer's or an observer's.
So first they need to know which participant is the candidate. That is harder than
it sounds: candidates join as "MacBook Pro", use nicknames, get entered under the
wrong name, rename themselves mid-call, and share the room with panels of
interviewers and silent observers.

This project identifies the candidate in real time by fusing several weak signals
into one confidence score, and it explains every decision. It never relies on a
single rule, and it declines to guess when the evidence is thin.

## The idea in one paragraph

Each participant is a hypothesis: "this person is the candidate." Five independent
signals each vote with a log-odds weight. An identity signal reads the display
name, a roster signal cross-references the calendar invite, a conversation-role
signal decides whether someone is asking or answering, a speaking-dynamics signal
looks at talk time, and a presence signal reads webcam and join time. The votes
are summed and passed through a softmax that also includes an explicit "unknown"
hypothesis, so the output is a real probability distribution. A policy then decides
whether to stay quiet, flag ambiguity, lean, or commit. Because the score is a sum
of signal contributions, the explanation is exact.

Full write-up in [docs/architecture.md](docs/architecture.md).

## What it handles

Each of these is a built-in scenario you can replay in the UI:

| Challenge from the brief | Scenario | What carries the decision |
| --- | --- | --- |
| Candidate joins as a device name | `macbook-pro` | conversation role and speaking pattern |
| Candidate uses a nickname | `nickname` | partial name match plus behavior |
| Interviewer entered the wrong name | `wrong-name` | metadata is ignored, roster and behavior win |
| Multiple interviewers | `multi-interviewer` | roster exclusion and single answerer |
| Candidate renames mid-interview | `name-change` | behavior holds the decision steady |
| Silent observers | `silent-observers` | sustained silence rules them out |

## Quick start

Requirements: Node 18 or newer.

```bash
npm install
npm run dev
# open http://localhost:3000
```

The app runs fully offline. No API keys are needed.

Other commands:

```bash
npm test           # unit and scenario tests (10 tests)
npm run replay             # evaluate every scenario in the terminal
npm run replay macbook-pro # print the full belief timeline for one scenario
npm run calibrate          # fit signal weights from the labeled scenarios
npm run build              # production build
```

## Optional: upgrade the transcript classifier to Claude

The conversation-role signal ships with a deterministic rule classifier so the
demo is reproducible and needs no network. If you provide an Anthropic key, the
"role model" toggle in the UI switches utterance labeling to Claude.

```bash
cp .env.example .env.local
# set ANTHROPIC_API_KEY in .env.local
```

With no key the toggle stays on the rule classifier and the app tells you so.

## How the demo works

Meeting event streams are simulated. The brief says to assume the system has
access to participant, audio, video, transcript, and calendar data, so each
scenario is a scripted stream of exactly those events with a known true candidate
for scoring. The engine in `src/engine` is a pure module: feed it events, get
back a belief snapshot after each one. In the demo that engine runs in the
browser and replays a scenario on a timer. In production the same code would run
behind the meeting-platform webhooks. Nothing about the engine changes between
the two.

The dashboard shows, live:

- the current decision and confidence
- a per-participant evidence waterfall (each signal's signed contribution)
- confidence over time, including the runner-up and the unknown mass
- the speaker-attributed transcript with ask or answer labels
- a plain-language explanation of the current call

## Project structure

```
src/
  engine/
    engine.ts          stream processor: events in, belief snapshots out
    fusion.ts          weighted log-odds -> softmax with an unknown hypothesis
    decision.ts        insufficient / ambiguous / leaning / confident
    explain.ts         deterministic natural-language rationale
    signals/           the five weak signals
    util/              string similarity and math helpers
  scenarios/           six labeled scenarios, one per edge case
  lib/                 replay hook, timeline, LLM client helper
  components/          dashboard UI
  app/                 Next.js app and the /api/classify route
scripts/
  replay.ts            CLI evaluation and timeline printing
  calibrate.ts         offline weight fitting from labeled interviews
tests/
  engine.test.ts       unit and end-to-end scenario tests
docs/
  architecture.md      diagram and design notes
  EVALUATION.md        testing, edge cases, accuracy, limitations
  DEMO_SCRIPT.md       walkthrough for the demo video
```

## Assumptions

- The system has access to the event and metadata streams listed in the brief.
  Real integrations with Zoom, Meet, and Teams are out of scope for a prototype,
  so those streams are simulated with scripted scenarios.
- Exactly one candidate is expected per interview, but the model does not require
  the candidate to be present. If no one looks like the candidate, the unknown
  hypothesis wins and the system says so.
- Calendar metadata is a prior, not ground truth. It can be missing, misspelled,
  or wrong, and the engine is free to disagree with it.
- The rule-based conversation classifier assumes English. The signal interface is
  language agnostic, and the Claude labeler removes that assumption.
- Weights are hand-set defaults. `npm run calibrate` shows how they would be
  refit from labeled interviews as more data arrives.

## Evaluation

Current results: 10 of 10 tests pass and all 6 scenarios identify the true
candidate. Details, edge cases, and limitations are in
[docs/EVALUATION.md](docs/EVALUATION.md).

## What I would improve next

- Add real audio and face embeddings as two more signals, so the decision keeps
  a single voice and face consistent across a call even through renames.
- Learn calibrated weights and thresholds from a real labeled corpus, and report
  a calibration curve rather than a single accuracy number.
- Handle harder cases: two people sharing one tile, a candidate who barely speaks,
  and interviews with more than one person answering.
- Persist beliefs and stream them to the fraud detectors so they attach to the
  candidate's audio and video track automatically.
