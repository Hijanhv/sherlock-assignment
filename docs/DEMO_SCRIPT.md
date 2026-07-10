# Demo video script

Target length 7 to 8 minutes. Six sections, in this order: architecture,
approach, demo, trade-offs, what I have improved, what I would improve next.
Have the live site open (https://sherlock-red.vercel.app) and a terminal ready.
The lines in quotes are what to say. Read them in your own voice.

## 1. Architecture (0:00 to 1:45)

Open `docs/architecture.md` or the architecture diagram in the README.

> Sherlock's fraud detectors have to analyze the candidate's audio and video,
> not the interviewer's. So the first job is knowing which participant is the
> candidate, and that breaks the moment someone joins as "MacBook Pro" or gets
> entered under the wrong name.
>
> Here is the architecture. On the left, two inputs. A live event stream from the
> meeting platform: joins, leaves, renames, webcam, screen share, speaking, and
> the transcript. And the calendar invite: the candidate and interviewer names
> and emails. The invite is treated as a prior, not as truth.
>
> Events flow into an ingestion layer that keeps per-participant state: who said
> what, how long they spoke, their camera, their join time. That state and the
> invite feed five independent signals. Each signal scores every participant.
>
> The signals feed a fusion step that combines them in log-odds and normalizes
> with an explicit unknown hypothesis. That produces a probability distribution,
> which drives two things: a decision policy with four states, and an explanation.
> The engine emits a fresh belief after every event, so it is real time by
> construction.
>
> One design choice worth calling out. The engine is a single pure module. In this
> demo it runs in the browser over scripted scenarios. In production the exact same
> code sits behind the meeting-platform webhooks. Nothing about the core changes.

## 2. Approach (1:45 to 3:15)

Stay on the diagram or switch to the README signal table.

> The core idea is to treat every participant as a hypothesis: this person is the
> candidate. Instead of one rule, I use five weak signals that each vote with a
> log-odds weight, and any signal is allowed to abstain when it has nothing to say.
>
> Identity reads the display name against the candidate name and email. Roster
> cross-references the calendar, so a verified candidate email is a strong yes and
> a known interviewer is a strong no. Conversation role is the important one: it
> reads the transcript and decides who is asking versus who is answering, because
> interviewers ask and candidates answer, and that is true no matter what someone
> calls themselves. Speaking dynamics looks at talk time and flags sustained
> silence. Presence reads webcam and join time as weak supporting cues.
>
> Two things make this work. First, because the signals combine in log-odds, the
> total score is just a sum of contributions, so the explanation is exact, not a
> guess about the model. Second, the softmax includes an explicit unknown class,
> so when nothing is discriminating the system says "gathering evidence" instead
> of picking the first person who joined. It reasons under uncertainty and it is
> allowed to say I do not know yet.

## 3. Demo (3:15 to 5:30)

Open the live dashboard. Start on the "MacBook Pro" scenario.

> Here is the candidate who joined as MacBook Pro. Watch the confidence line. Early
> on, most of the belief sits on unknown and the banner says gathering evidence. It
> refuses to commit before it has heard anyone.

Let it play. Point at the MacBook Pro card and its evidence bars.

> As the interview goes, look at the evidence waterfall. Identity and roster are
> both zero for this person, because the name is a device label. The decision is
> carried entirely by conversation role and speaking. It lands at 84 percent, and
> the "why this call" panel spells out exactly why, in plain language.

Click the "External metadata is incorrect" scenario.

> This is the strongest case. The invite names Sarah Kim, but nobody by that name
> or email is in the room. A name-matching system fails here. Sherlock ignores the
> bad metadata, excludes the interviewer by roster, reads who is answering, and
> still gets it right at 86 percent.

Click "Multiple observers join silently". Point at the observer with the camera on.

> Two people never speak, and one even has their camera on. Camera alone is
> deliberately weak, so the observer is not mistaken for the candidate. Silence and
> the lack of a conversational role push both of them to the bottom.

Click "Candidate changes their display name" and scrub to the rename.

> Here the candidate renames to initials halfway through. Watch the confidence line
> stay flat across the rename, because by then behavior, not the name, is carrying
> the decision.

Optional, if you set a key: toggle the role model to Claude.

> This toggle swaps the rule classifier for Claude. Without a key it stays on rules,
> so the whole thing runs offline and reproducibly.

## 4. Trade-offs (5:30 to 6:15)

> A few honest trade-offs. The demo simulates the meeting streams, because real
> Zoom and Meet integration is out of scope for a prototype, but the engine is
> written to take real webhook events unchanged. The default conversation
> classifier is rule based and English only, which keeps the demo deterministic;
> the Claude option removes that limit. And the thresholds and weights are tuned on
> six scenarios, so they are reasonable but not yet calibrated on real data. I chose
> reproducibility and clarity over a heavier setup, which I think is the right call
> for a prototype whose whole point is to show the reasoning.

## 5. What I have improved (6:15 to 7:00)

> Compared to the obvious approach, here is what this improves. A naive system
> matches the display name to the invite and stops. That fails on almost every case
> in the brief. I replaced it with multi-signal fusion, so no single failure sinks
> the decision. I added an explicit unknown hypothesis, so the system can decline
> to guess. I made every decision explainable down to the exact contribution of
> each signal. And I made it real time, updating after every event, with a
> confidence score rather than a yes or no.

Run the terminal.

```bash
npm test
npm run replay
npm run calibrate
```

> Ten tests pass, all six scenarios are correct, and calibration shows the learning
> path: given labeled interviews it refits the weights, and it independently finds
> that the behavioral signals deserve the most weight.

## 6. What I would improve next (7:00 to 7:45)

> What I would add next. First, real voice and face embeddings as two more signals,
> so the system keeps a single voice and face consistent across the whole call,
> even through a rename. That is the strongest signal available and it slots into
> the same interface. Second, calibrated weights and thresholds from a real labeled
> corpus, and a calibration curve instead of a single accuracy number. Third, harder
> cases like two people on one camera or a panel where more than one person answers.
> And finally, streaming the belief straight to the fraud detectors so they attach
> to the candidate's audio and video track automatically.

Close on the dashboard showing a confident, explained decision.
