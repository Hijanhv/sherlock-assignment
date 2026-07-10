"use client";

import type { ParticipantBelief } from "@/engine/types";
import { SIGNAL_META, barColor, contributionColor, pct, signedNats } from "@/lib/ui";

const BAR_SCALE = 3.3; // nats that fill the evidence bar

function EvidenceRow({
  label,
  contribution,
  rationale,
}: {
  label: string;
  contribution: number;
  rationale: string;
}) {
  const width = Math.min(100, (Math.abs(contribution) / BAR_SCALE) * 100);
  return (
    <div className="grid grid-cols-[86px_1fr_52px] items-center gap-2 py-1">
      <span className="truncate text-[11px] text-slate-500">{label}</span>
      <div className="relative h-4">
        <div className="absolute left-1/2 top-0 h-full w-px bg-slate-300" />
        <div
          className={`bar-fill absolute top-0.5 h-3 rounded-sm ${barColor(contribution)}`}
          style={{
            width: `${width / 2}%`,
            left: contribution >= 0 ? "50%" : undefined,
            right: contribution < 0 ? "50%" : undefined,
          }}
          title={rationale}
        />
      </div>
      <span className={`text-right font-mono text-[11px] ${contributionColor(contribution)}`}>
        {signedNats(contribution)}
      </span>
    </div>
  );
}

export function ParticipantCard({
  belief,
  isLeader,
  isSpeaking,
  rank,
}: {
  belief: ParticipantBelief;
  isLeader: boolean;
  isSpeaking: boolean;
  rank: number;
}) {
  const evidence = [...belief.evidence].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );
  const topRationale = evidence.find((e) => Math.abs(e.contribution) > 0.05)?.rationale;

  return (
    <div
      className={`rounded-lg border p-3.5 transition-colors ${
        isLeader
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              isSpeaking ? "bg-emerald-500 speaking-dot" : "bg-slate-300"
            }`}
          />
          <span className="truncate text-sm font-medium text-slate-900">{belief.displayName}</span>
          <span className="shrink-0 font-mono text-[10px] text-slate-400">#{rank}</span>
        </div>
        <span className="shrink-0 font-mono text-sm font-semibold text-slate-900">
          {pct(belief.probability)}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`bar-fill h-full rounded-full ${isLeader ? "bg-emerald-500" : "bg-slate-400"}`}
          style={{ width: `${Math.max(2, belief.probability * 100)}%` }}
        />
      </div>

      {topRationale && (
        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-500">{topRationale}</p>
      )}

      <div className="mt-2 border-t border-slate-100 pt-1.5">
        {evidence.map((e) => (
          <EvidenceRow
            key={e.signalId}
            label={SIGNAL_META[e.signalId].short}
            contribution={e.contribution}
            rationale={e.rationale}
          />
        ))}
      </div>
    </div>
  );
}
