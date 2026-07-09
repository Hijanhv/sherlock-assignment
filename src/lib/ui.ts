import type { DecisionState, SignalId } from "@/engine/types";

export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export function signedNats(x: number): string {
  const s = x >= 0 ? "+" : "";
  return `${s}${x.toFixed(2)}`;
}

export const SIGNAL_META: Record<SignalId, { label: string; short: string }> = {
  identity: { label: "Name / identity match", short: "Identity" },
  roster: { label: "Calendar roster match", short: "Roster" },
  conversation_role: { label: "Conversation role", short: "Role" },
  speaking_dynamics: { label: "Speaking dynamics", short: "Speaking" },
  presence: { label: "Presence & behavior", short: "Presence" },
};

export const DECISION_META: Record<
  DecisionState,
  { label: string; tone: string; ring: string; text: string }
> = {
  confident: {
    label: "Candidate identified",
    tone: "bg-emerald-500/15 border-emerald-500/40",
    ring: "bg-emerald-400",
    text: "text-emerald-300",
  },
  leaning: {
    label: "Leading candidate",
    tone: "bg-sky-500/15 border-sky-500/40",
    ring: "bg-sky-400",
    text: "text-sky-300",
  },
  ambiguous: {
    label: "Ambiguous, holding",
    tone: "bg-amber-500/15 border-amber-500/40",
    ring: "bg-amber-400",
    text: "text-amber-300",
  },
  insufficient: {
    label: "Gathering evidence",
    tone: "bg-slate-500/10 border-slate-600/50",
    ring: "bg-slate-400",
    text: "text-slate-300",
  },
};

export function contributionColor(x: number): string {
  if (x > 0.05) return "text-emerald-400";
  if (x < -0.05) return "text-rose-400";
  return "text-slate-500";
}

export function barColor(x: number): string {
  if (x > 0.05) return "bg-emerald-500";
  if (x < -0.05) return "bg-rose-500";
  return "bg-slate-600";
}
