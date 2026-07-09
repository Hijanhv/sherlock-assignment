// A tiny fluent builder for meeting event streams. It keeps the scenario files
// readable and makes speaking turns consistent: says() emits a speaking-start,
// a transcript line, and a speaking-stop spaced by a realistic duration.

import type { MeetingEvent } from "../engine/types";

function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  // ~2.8 words/sec of speech, floored so short lines still take a beat.
  return Math.max(2, Math.round((words / 2.8) * 10) / 10);
}

export class Timeline {
  private t = 0;
  readonly events: MeetingEvent[] = [];

  at(seconds: number): this {
    this.t = seconds;
    return this;
  }

  wait(seconds: number): this {
    this.t += seconds;
    return this;
  }

  meetingStart(): this {
    this.events.push({ t: this.t, kind: "meeting_start" });
    return this;
  }

  join(participantId: string, displayName: string, email?: string): this {
    this.events.push({ t: this.t, kind: "participant_join", participantId, displayName, email });
    return this;
  }

  leave(participantId: string): this {
    this.events.push({ t: this.t, kind: "participant_leave", participantId });
    return this;
  }

  rename(participantId: string, displayName: string): this {
    this.events.push({ t: this.t, kind: "display_name_change", participantId, displayName });
    return this;
  }

  cam(participantId: string, on: boolean): this {
    this.events.push({ t: this.t, kind: "webcam", participantId, on });
    return this;
  }

  share(participantId: string, on: boolean): this {
    this.events.push({ t: this.t, kind: "screenshare", participantId, on });
    return this;
  }

  /** One spoken turn: speaking on, transcript, speaking off, then a short gap. */
  says(participantId: string, text: string, duration?: number): this {
    const dur = duration ?? estimateDuration(text);
    this.events.push({ t: this.t, kind: "speaking", participantId, on: true });
    this.events.push({ t: this.t + 0.1, kind: "transcript", participantId, text });
    this.events.push({ t: this.t + dur, kind: "speaking", participantId, on: false });
    this.t += dur + 1.2; // gap before the next turn
    return this;
  }

  build(): MeetingEvent[] {
    // Stable sort by time so interleaved authoring still replays in order.
    return [...this.events].sort((a, b) => a.t - b.t);
  }
}
