"use client";

import type { Scenario } from "@/scenarios";

export function ScenarioPicker({
  scenarios,
  activeId,
  onSelect,
}: {
  scenarios: Scenario[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const active = scenarios.find((s) => s.id === activeId);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              s.id === activeId
                ? "border-slate-400 bg-slate-100 text-ink-950"
                : "border-ink-600 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            }`}
          >
            {s.challenge}
          </button>
        ))}
      </div>
      {active && (
        <div className="mt-3 rounded-lg border border-ink-600 bg-ink-800/40 p-3">
          <div className="text-sm font-medium text-slate-200">{active.title}</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{active.summary}</p>
        </div>
      )}
    </div>
  );
}
