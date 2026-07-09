"use client";

import { useEffect, useMemo, useState } from "react";
import { SCENARIOS, getScenario } from "@/scenarios";
import type { Labeler } from "@/engine/signals";
import { computeTimeline, scenarioUtterances } from "@/lib/timeline";
import { buildLlmLabeler } from "@/lib/llm";
import { useReplay } from "@/lib/useReplay";
import { pct } from "@/lib/ui";
import { DecisionBanner } from "@/components/DecisionBanner";
import { ParticipantCard } from "@/components/ParticipantCard";
import { ConfidenceTimeline } from "@/components/ConfidenceTimeline";
import { TranscriptFeed } from "@/components/TranscriptFeed";
import { Controls } from "@/components/Controls";
import { ScenarioPicker } from "@/components/ScenarioPicker";

type RoleModel = "rules" | "claude";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-ink-600 bg-ink-800/40 p-4">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

export default function Home() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = getScenario(scenarioId)!;

  const [roleModel, setRoleModel] = useState<RoleModel>("rules");
  const [labeler, setLabeler] = useState<Labeler | undefined>(undefined);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  // Load the LLM labeler when requested; fall back to rules on the scenario's
  // utterances. Reset to rules whenever the scenario changes.
  useEffect(() => {
    let cancelled = false;
    if (roleModel === "rules") {
      setLabeler(undefined);
      setLlmAvailable(null);
      return;
    }
    setLlmLoading(true);
    buildLlmLabeler(scenarioUtterances(scenario)).then(({ labeler: l, available }) => {
      if (cancelled) return;
      setLabeler(() => l);
      setLlmAvailable(available);
      setLlmLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [roleModel, scenario]);

  const timeline = useMemo(() => computeTimeline(scenario, labeler), [scenario, labeler]);
  const replay = useReplay(timeline);
  const { belief } = replay;

  const nameFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const step of replay.appliedSteps) {
      const e = step.event;
      if (e.kind === "participant_join" || e.kind === "display_name_change") {
        map.set(e.participantId, e.displayName);
      }
    }
    return (id: string) => map.get(id) ?? id;
  }, [replay.appliedSteps]);

  const speakingIds = useMemo(() => {
    const active = new Set<string>();
    for (const step of replay.appliedSteps) {
      if (step.event.kind === "speaking") {
        if (step.event.on) active.add(step.event.participantId);
        else active.delete(step.event.participantId);
      }
      if (step.event.kind === "participant_leave") active.delete(step.event.participantId);
    }
    return active;
  }, [replay.appliedSteps]);

  const ctx = scenario.context;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 font-mono text-sm font-bold text-ink-950">
              S
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">Sherlock</h1>
            <span className="rounded border border-ink-600 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
              candidate-id
            </span>
          </div>
          <p className="mt-1.5 max-w-xl text-sm text-slate-500">
            Identifies the interview candidate in real time by fusing several weak signals into a
            single confidence score, and shows the evidence behind every call.
          </p>
        </div>
      </header>

      <div className="mb-5">
        <ScenarioPicker scenarios={SCENARIOS} activeId={scenarioId} onSelect={setScenarioId} />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left: decision, timeline, controls, transcript */}
        <div className="space-y-5 lg:col-span-7">
          <DecisionBanner belief={belief} />

          <Panel title="Why this call">
            <p className="text-sm leading-relaxed text-slate-300">{belief.explanation}</p>
          </Panel>

          <Panel title="Confidence over time">
            <ConfidenceTimeline history={replay.history} />
          </Panel>

          <Controls
            playing={replay.playing}
            atEnd={replay.atEnd}
            index={replay.index}
            total={timeline.steps.length}
            speed={replay.speed}
            onToggle={replay.toggle}
            onRestart={replay.restart}
            onSeek={replay.seek}
            onSpeed={replay.setSpeed}
            llm={{
              enabled: roleModel === "claude",
              available: llmAvailable,
              loading: llmLoading,
              onToggle: () => setRoleModel((m) => (m === "rules" ? "claude" : "rules")),
            }}
          />

          <Panel title="Live transcript">
            <TranscriptFeed steps={replay.appliedSteps} nameFor={nameFor} />
          </Panel>
        </div>

        {/* Right: case file + participants */}
        <div className="space-y-5 lg:col-span-5">
          <Panel title="Case file (from the invite)">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Meeting</dt>
                <dd className="text-right text-slate-300">{ctx.title}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Candidate name</dt>
                <dd className="text-right text-slate-300">{ctx.candidateName ?? "unknown"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Candidate email</dt>
                <dd className="text-right font-mono text-xs text-slate-400">
                  {ctx.candidateEmail ?? "unknown"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Interviewers</dt>
                <dd className="text-right text-slate-300">
                  {ctx.interviewers.map((i) => i.name).join(", ") || "none listed"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-ink-700 pt-2 text-[11px] leading-snug text-slate-600">
              This metadata is treated as a prior, not ground truth. It can be wrong, and the engine
              is free to disagree with it.
            </p>
          </Panel>

          <Panel title={`Participants (${belief.beliefs.length})`}>
            <div className="space-y-2.5">
              {belief.beliefs.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-600">No one has joined yet.</p>
              )}
              {belief.beliefs.map((b, i) => (
                <ParticipantCard
                  key={b.participantId}
                  belief={b}
                  rank={i + 1}
                  isLeader={b.participantId === belief.leaderId}
                  isSpeaking={speakingIds.has(b.participantId)}
                />
              ))}
            </div>
            <div className="mt-3 flex justify-between border-t border-ink-700 pt-2 text-[11px] text-slate-600">
              <span>unknown hypothesis</span>
              <span className="font-mono">{pct(belief.unknownMass)}</span>
            </div>
          </Panel>
        </div>
      </div>

      <footer className="mt-8 border-t border-ink-700 pt-4 text-[11px] text-slate-600">
        Signals: identity, calendar roster, conversation role, speaking dynamics, presence. Fused in
        log-odds, normalized with an explicit unknown hypothesis so the system can decline to guess.
      </footer>
    </main>
  );
}
