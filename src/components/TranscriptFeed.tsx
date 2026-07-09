"use client";

import { useEffect, useRef } from "react";
import type { TimelineStep } from "@/lib/timeline";
import { ruleClassify } from "@/engine/signals/conversationRole";

const ROLE_STYLE: Record<string, string> = {
  ask: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  answer: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  neutral: "text-slate-400 border-slate-600/40 bg-slate-500/10",
};

export function TranscriptFeed({
  steps,
  nameFor,
}: {
  steps: TimelineStep[];
  nameFor: (id: string) => string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lines = steps.filter((s) => s.event.kind === "transcript");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div ref={scrollRef} className="scroll-quiet h-64 space-y-2.5 overflow-y-auto pr-1">
      {lines.length === 0 && (
        <p className="pt-8 text-center text-xs text-slate-600">No speech yet.</p>
      )}
      {lines.map((s, i) => {
        if (s.event.kind !== "transcript") return null;
        const { label } = ruleClassify(s.event.text);
        return (
          <div key={i} className="text-sm">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="font-medium text-slate-300">{nameFor(s.event.participantId)}</span>
              <span
                className={`rounded border px-1.5 py-px text-[10px] uppercase tracking-wide ${ROLE_STYLE[label]}`}
              >
                {label}
              </span>
              <span className="font-mono text-[10px] text-slate-600">{Math.round(s.event.t)}s</span>
            </div>
            <p className="leading-snug text-slate-400">{s.event.text}</p>
          </div>
        );
      })}
    </div>
  );
}
