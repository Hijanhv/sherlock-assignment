"use client";

const SPEEDS = [1, 2, 4, 8];

export function Controls({
  playing,
  atEnd,
  index,
  total,
  speed,
  onToggle,
  onRestart,
  onSeek,
  onSpeed,
  llm,
}: {
  playing: boolean;
  atEnd: boolean;
  index: number;
  total: number;
  speed: number;
  onToggle: () => void;
  onRestart: () => void;
  onSeek: (i: number) => void;
  onSpeed: (s: number) => void;
  llm: { enabled: boolean; available: boolean | null; loading: boolean; onToggle: () => void };
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={atEnd ? onRestart : onToggle}
          className="rounded-md bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          {atEnd ? "Replay" : playing ? "Pause" : "Play"}
        </button>
        <button
          onClick={onRestart}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
        >
          Restart
        </button>

        <div className="flex items-center gap-1 text-xs text-slate-500">
          <span className="mr-1">speed</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={`rounded px-1.5 py-0.5 font-mono ${
                speed === s ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[11px] text-slate-400">
            {index}/{total}
          </span>
          <button
            onClick={llm.onToggle}
            disabled={llm.loading}
            title="Upgrade the transcript role classifier from rules to Claude (requires ANTHROPIC_API_KEY)"
            className={`rounded-md border px-2.5 py-1.5 text-xs ${
              llm.enabled
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-slate-300 text-slate-600 hover:bg-slate-100"
            } ${llm.loading ? "opacity-60" : ""}`}
          >
            {llm.loading
              ? "loading model..."
              : llm.enabled
                ? "role model: Claude"
                : "role model: rules"}
          </button>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={total}
        value={index}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="mt-3 w-full accent-emerald-500"
      />
      {llm.enabled && llm.available === false && (
        <p className="mt-2 text-[11px] text-amber-600">
          No API key detected, staying on the rule classifier. Add ANTHROPIC_API_KEY to enable Claude.
        </p>
      )}
    </div>
  );
}
