// Optional LLM upgrade for the conversation-role signal.
//
// POST { utterances: string[] } -> { available: boolean, labels: UtteranceLabel[] }
//
// With no ANTHROPIC_API_KEY the route reports available:false and the client
// keeps using the built-in rule classifier, so the app runs unchanged offline.
// With a key, Claude labels each utterance as ask / answer / neutral.

import { NextResponse } from "next/server";
import type { UtteranceLabel } from "@/engine/signals/conversationRole";

export const runtime = "nodejs";

interface ClassifyRequest {
  utterances: string[];
}

const SYSTEM = `You label single utterances from a job interview transcript by conversational role.
Return ONLY a JSON array, one object per utterance in order, each: {"label": "ask" | "answer" | "neutral", "strength": number between 0 and 1}.
"ask" = the speaker is questioning or steering (interviewer behavior).
"answer" = the speaker is explaining their own experience or reasoning (candidate behavior).
"neutral" = greeting, acknowledgement, or logistics.
strength is your confidence in the label. No prose, no markdown, JSON array only.`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ available: false, labels: [] });
  }

  let body: ClassifyRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const utterances = Array.isArray(body.utterances) ? body.utterances : [];
  if (utterances.length === 0) {
    return NextResponse.json({ available: true, labels: [] });
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

    const numbered = utterances.map((u, i) => `${i + 1}. ${u}`).join("\n");
    const msg = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM,
      messages: [{ role: "user", content: numbered }],
    });

    const text = msg.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    const labels = parseLabels(text, utterances.length);
    return NextResponse.json({ available: true, labels });
  } catch (err) {
    // Fail soft: the client falls back to rules if the upgrade is unavailable.
    const message = err instanceof Error ? err.message : "classification failed";
    return NextResponse.json({ available: false, labels: [], error: message }, { status: 200 });
  }
}

function parseLabels(text: string, expected: number): UtteranceLabel[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: UtteranceLabel[] = [];
  for (let i = 0; i < expected; i++) {
    const item = parsed[i] as { label?: string; strength?: number } | undefined;
    const label =
      item?.label === "ask" || item?.label === "answer" ? item.label : "neutral";
    const strength =
      typeof item?.strength === "number" ? Math.max(0, Math.min(1, item.strength)) : 0.5;
    out.push({ label, strength });
  }
  return out;
}
