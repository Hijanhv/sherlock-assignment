# Demo video script (target 6 to 8 minutes)

A shot-by-shot outline for the walkthrough. Adjust wording to your own voice.
Have `npm run dev` running and the terminal ready for the replay command.

## 0:00 to 0:45 - The problem

Show the brief's list of failure cases on screen or just say them.

> Sherlock's fraud detectors have to analyze the candidate's audio and video, not
> the interviewer's. So the first job is knowing who the candidate is. That breaks
> the moment someone joins as "MacBook Pro", uses a nickname, gets entered under
> the wrong name, or renames themselves mid-call. I treated this as reasoning
> under uncertainty rather than string matching.

## 0:45 to 2:15 - Approach and architecture

Open `docs/architecture.md` and show the diagram.

> Every participant is a hypothesis: this person is the candidate. Five
> independent signals each vote with a log-odds weight. Identity reads the display
> name. Roster cross-references the calendar invite. Conversation role decides who
> is asking versus answering. Speaking dynamics looks at talk time. Presence reads
> webcam and join time.
>
> The votes are summed and passed through a softmax that also includes an explicit
> unknown hypothesis, so the result is a real probability distribution and the
> system can say "I don't know yet." Two things matter here. First, each signal is
> allowed to be weak and to abstain, so no single failure sinks the decision.
> Second, because the score is a sum of contributions, the explanation is exact.

## 2:15 to 5:00 - Live demo

Open the dashboard. Start with the `macbook-pro` scenario.

> Here the candidate joined as MacBook Pro. Watch the confidence timeline. Early
> on, the unknown hypothesis holds most of the mass and the system says gathering
> evidence. It refuses to pick the first person who joined.

Let it play. Point at the participant with the device name.

> As the interview goes on, the identity signal contributes nothing for the device
> name, you can see it sitting at zero in the waterfall. The decision is carried by
> conversation role and speaking dynamics. It lands on the right person at 84
> percent and explains exactly why.

Switch to `wrong-name`.

> This is the strongest case. The invite names Sarah Kim, but no one by that name
> or email is in the room. A name-only system fails here. Sherlock ignores the bad
> metadata, excludes the interviewer by roster, reads who is answering the
> questions, and still gets it right.

Switch to `silent-observers`. Point at the observer with the camera on.

> Two people never speak. One even has their camera on. Camera state alone is
> deliberately weak, so the observer is not mistaken for the candidate. Sustained
> silence and the lack of a conversational role push both observers to the bottom.

Switch to `name-change`. Scrub to the rename event.

> The candidate renames to initials halfway through. Watch the timeline stay flat
> through the rename. By then, behavior is carrying the decision, not the name.

Optional: toggle the role model to Claude if you have a key set, and note it
falls back to rules otherwise.

## 5:00 to 6:00 - Under the hood

Run the terminal.

```bash
npm test
npm run replay
npm run calibrate
```

> Ten tests, all six scenarios correct. Calibration shows the learning story: give
> it labeled interviews and it refits the signal weights, and it rediscovers that
> the behavioral signals deserve the most weight.

## 6:00 to 7:00 - Trade-offs and what is next

> Trade-offs. The demo simulates the meeting streams, because the brief says to
> assume access to them, but the engine is a pure module that would sit behind the
> real webhooks unchanged. The rule classifier is English-only, which the Claude
> option removes. Thresholds are tuned on a small set.
>
> What I would add next: real voice and face embeddings as two more signals, so
> the system keeps a single voice and face consistent across the whole call, even
> through a rename. That plus calibrated thresholds from a real corpus is the path
> to production.

Close on the dashboard with a confident, explained decision on screen.
