"use client";

import type { Belief } from "@/engine/types";
import { DECISION_META, pct } from "@/lib/ui";

export function DecisionBanner({ belief }: { belief: Belief }) {
  const meta = DECISION_META[belief.decision];
  const leader = belief.beliefs.find((b) => b.participantId === belief.leaderId) ?? belief.beliefs[0];
  const confidence = leader?.probability ?? 0;

  return (
    <div className={`rounded-xl border ${meta.tone} p-5`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${meta.ring} ${belief.decision === "confident" ? "speaking-dot" : ""}`} />
          <span className={`text-sm font-medium uppercase tracking-wider ${meta.text}`}>
            {meta.label}
          </span>
        </div>
        <span className="font-mono text-xs text-slate-500">t = {Math.round(belief.t)}s</span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold text-slate-100">
            {belief.leaderId ? leader?.displayName : "No candidate yet"}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {belief.leaderId
              ? "current best identification"
              : `unknown mass ${pct(belief.unknownMass)}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-semibold text-slate-100">{pct(confidence)}</div>
          <div className="text-xs text-slate-500">confidence</div>
        </div>
      </div>
    </div>
  );
}
