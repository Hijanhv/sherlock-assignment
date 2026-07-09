"use client";

import type { Belief } from "@/engine/types";

const W = 320;
const H = 130;
const PAD = { l: 6, r: 6, t: 10, b: 18 };

function path(values: number[]): string {
  const n = values.length;
  if (n === 0) return "";
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  return values
    .map((v, i) => {
      const x = PAD.l + (n === 1 ? 0 : (i / (n - 1)) * innerW);
      const y = PAD.t + (1 - v) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ConfidenceTimeline({ history }: { history: Belief[] }) {
  const topProb = history.map((b) => b.beliefs[0]?.probability ?? 0);
  const runnerProb = history.map((b) => b.beliefs[1]?.probability ?? 0);
  const unknown = history.map((b) => b.unknownMass);

  const gridY = [0, 0.5, 1].map((v) => PAD.t + (1 - v) * (H - PAD.t - PAD.b));

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-emerald-400" /> leader
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-sky-400" /> runner-up
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-slate-500" /> unknown
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-32 w-full"
        role="img"
        aria-label="Confidence over time"
      >
        {gridY.map((y, i) => (
          <line
            key={i}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={y}
            y2={y}
            stroke="#1d2430"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path
          d={path(unknown)}
          fill="none"
          stroke="#64748b"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path(runnerProb)}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path(topProb)}
          fill="none"
          stroke="#34d399"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-600">
        <span>start</span>
        <span>now</span>
      </div>
    </div>
  );
}
