# Evaluation

## How it was tested

Three layers, all runnable from the repo:

1. **Unit and end-to-end tests** (`npm test`, 10 tests). These cover the string
   utilities, the rule classifier, the fusion math, and every scenario end to
   end. They assert not just the final answer but behavior along the way: that
   the engine stays uncertain before anyone speaks, that a device-named candidate
   is still found from behavior alone, that wrong metadata does not derail the
   result, that silent observers sink to the bottom, and that confidence survives
   a mid-call rename.
2. **Scenario replay** (`npm run replay`). Runs all six scenarios and prints the
   final decision, the leader, and the confidence. `npm run replay <id>` prints
   the full belief timeline for one scenario so you can watch the decision form.
3. **Calibration** (`npm run calibrate`). Fits signal weights from the labeled
   scenarios and reports log-likelihood and accuracy before and after, which is
   both a learning demonstration and a sanity check on the fusion model.

## Results

All six scenarios identify the true candidate, each reaching a confident
decision:

| Scenario | Decision | Leader confidence | What made it hard |
| --- | --- | --- | --- |
| `macbook-pro` | confident | 84% | display name carries no identity |
| `nickname` | confident | 98% | name only partially matches |
| `wrong-name` | confident | 86% | invite names the wrong person |
| `multi-interviewer` | confident | 99% | three interviewers, one candidate |
| `name-change` | confident | 98% | candidate renames mid-call |
| `silent-observers` | confident | 97% | two non-speaking participants |

Calibration lifts the mean log-likelihood of the true candidate from -0.104 to
-0.024 while holding accuracy at 100%, and it independently rediscovers that the
behavioral signals (conversation role, speaking dynamics) deserve the most
weight.

## Edge cases and how each is handled

- **Device or placeholder name.** The identity signal detects labels like
  "MacBook Pro", "Guest 2", and "Someone's iPad" and abstains rather than
  guessing. The decision falls back to behavior.
- **Nickname.** Name similarity blends Jaro-Winkler with token overlap, so "Jon"
  still partially matches "Jonathan Decker" and contributes weak positive support
  that agrees with the behavioral signals.
- **Wrong metadata.** When the invited name and email match no one in the room,
  the identity and roster signals simply produce nothing for anyone, and the
  decision is driven by roster exclusion of the interviewer and by conversation
  role. Metadata is a prior, never an override.
- **Multiple interviewers.** Roster exclusion pushes every known interviewer far
  negative, and the conversation-role signal separates the single answerer from
  the panel of askers.
- **Mid-call rename.** By the time a candidate renames, behavioral evidence has
  accumulated and dominates. Identity support drops at the rename, but the total
  score barely moves, so the confidence timeline stays flat through the event.
  This is asserted directly in the tests.
- **Silent observers.** Camera state alone is deliberately weak, so an observer
  with the camera on is not mistaken for the candidate. Sustained silence and the
  absence of a conversational role are what rule observers out.
- **Not enough evidence yet.** Before anyone speaks, the unknown hypothesis holds
  most of the probability mass and the decision is `insufficient`. The system
  reports "gathering evidence" instead of picking the first person to join.

## Why fusion beats any single rule

Each scenario is built so that the naive rule fails. Name matching fails on
`macbook-pro`, `wrong-name`, and `name-change`. Roster matching alone fails when
the candidate has no listed email. Talk time alone would rank a chatty
interviewer above a concise candidate. Because the signals are combined in
log-odds and each can abstain, a failure in one signal is absorbed by the others.
The `wrong-name` scenario is the clearest example: the identity signal is useless
and slightly misleading, yet roster exclusion and conversation role still produce
an 86% confident, correct call.

## Confidence, not just an answer

The output is a probability distribution with an explicit unknown mass, updated
after every event. The decision policy has four states and only commits at
`confident`. Ambiguity and insufficiency are first-class outcomes, which matches
the brief's requirement to handle uncertainty gracefully rather than force a
guess.

## Limitations

- **Simulated streams.** The prototype does not integrate with Zoom, Meet, or
  Teams. It consumes the event and metadata streams the brief says to assume, and
  the engine is written so those events could come from a real webhook unchanged.
- **No audio or face biometrics yet.** The strongest possible signals, a
  consistent voiceprint and face across the call, are not implemented. They are
  the first thing I would add, and the signal interface is designed to take them.
- **English-only rule classifier.** The deterministic conversation classifier
  keys on English question and answer cues. The Claude labeler removes this, and
  the rest of the engine is language agnostic.
- **Thresholds tuned on a small set.** The decision thresholds and default
  weights are reasonable but fit to six scenarios. Real calibration needs a
  labeled corpus, and `calibrate.ts` is the path to it.
- **Adversarial cases are out of scope.** A candidate who deliberately mimics an
  interviewer's speech pattern, or a fraud ring coordinating to confuse
  attribution, would need the biometric signals and cross-call history to catch.
  The current model assumes participants behave like themselves.
