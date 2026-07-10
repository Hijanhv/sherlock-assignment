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
    tone: "bg-emerald-50 border-emerald-200",
    ring: "bg-emerald-500",
    text: "text-emerald-700",
  },
  leaning: {
    label: "Leading candidate",
    tone: "bg-sky-50 border-sky-200",
    ring: "bg-sky-500",
    text: "text-sky-700",
  },
  ambiguous: {
    label: "Ambiguous, holding",
    tone: "bg-amber-50 border-amber-200",
    ring: "bg-amber-500",
    text: "text-amber-700",
  },
  insufficient: {
    label: "Gathering evidence",
    tone: "bg-slate-50 border-slate-200",
    ring: "bg-slate-400",
    text: "text-slate-600",
  },
};

export function contributionColor(x: number): string {
  if (x > 0.05) return "text-emerald-600";
  if (x < -0.05) return "text-rose-600";
  return "text-slate-400";
}

export function barColor(x: number): string {
  if (x > 0.05) return "bg-emerald-500";
  if (x < -0.05) return "bg-rose-500";
  return "bg-slate-300";
}
