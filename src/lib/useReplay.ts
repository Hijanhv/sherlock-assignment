"use client";

import { useEffect, useMemo, useState } from "react";
import type { Belief } from "@/engine/types";
import type { ScenarioTimeline, TimelineStep } from "./timeline";

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export interface ReplayState {
  /** Number of events applied so far (0..steps.length). */
  index: number;
  playing: boolean;
  speed: number;
  belief: Belief;
  history: Belief[];
  appliedSteps: TimelineStep[];
  atEnd: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  seek: (index: number) => void;
  setSpeed: (speed: number) => void;
}

export function useReplay(timeline: ScenarioTimeline): ReplayState {
  const { initial, steps } = timeline;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);

  // Reset when the timeline changes (new scenario or labeler).
  useEffect(() => {
    setIndex(0);
    setPlaying(true);
  }, [timeline]);

  useEffect(() => {
    if (!playing || index >= steps.length) return;
    const prevT = index > 0 ? steps[index - 1].event.t : 0;
    const nextT = steps[index].event.t;
    const delay = clamp(((nextT - prevT) / speed) * 1000, 120, 1100);
    const id = setTimeout(() => setIndex((i) => i + 1), delay);
    return () => clearTimeout(id);
  }, [playing, index, steps, speed]);

  useEffect(() => {
    if (index >= steps.length) setPlaying(false);
  }, [index, steps.length]);

  const belief = index === 0 ? initial : steps[index - 1].belief;
  const appliedSteps = useMemo(() => steps.slice(0, index), [steps, index]);
  const history = useMemo(
    () => [initial, ...appliedSteps.map((s) => s.belief)],
    [initial, appliedSteps],
  );

  return {
    index,
    playing,
    speed,
    belief,
    history,
    appliedSteps,
    atEnd: index >= steps.length,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying((p) => !p),
    restart: () => {
      setIndex(0);
      setPlaying(true);
    },
    seek: (i: number) => {
      setPlaying(false);
      setIndex(clamp(i, 0, steps.length));
    },
    setSpeed,
  };
}
