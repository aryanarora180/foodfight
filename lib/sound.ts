"use client";

import { useSyncExternalStore } from "react";

// All sounds are synthesized with the Web Audio API, so there are no assets
// to load. Muting is a per-device preference kept in localStorage.
const MUTE_KEY = "foodfight:muted";
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

let muted: boolean | null = null;

export function isMuted(): boolean {
  if (muted === null) muted = readMuted();
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

export function useMuted(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isMuted,
    () => false
  );
  return [value, setMuted];
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || isMuted()) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  c: AudioContext,
  { freq, endFreq, start = 0, dur, type = "sine", gain = 0.15 }: {
    freq: number;
    endFreq?: number;
    start?: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
  }
) {
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type SoundName = "tick" | "ding" | "thud" | "bleat" | "lock" | "pop";

// `pitch` nudges a sound up or down, e.g. so the reel ticks climb as the
// spin slows down.
export function play(name: SoundName, pitch = 1) {
  const c = audio();
  if (!c) return;
  switch (name) {
    case "tick":
      tone(c, { freq: 700 * pitch, dur: 0.04, type: "square", gain: 0.05 });
      break;
    case "pop":
      tone(c, { freq: 500, endFreq: 900, dur: 0.07, gain: 0.07 });
      break;
    case "lock":
      tone(c, { freq: 1200, dur: 0.07, gain: 0.1 });
      tone(c, { freq: 1800, start: 0.07, dur: 0.12, gain: 0.1 });
      break;
    case "ding":
      // a quick rising arpeggio ending on a held bell
      [523, 659, 784].forEach((f, i) => tone(c, { freq: f, start: i * 0.09, dur: 0.18, gain: 0.12 }));
      tone(c, { freq: 1047, start: 0.27, dur: 0.9, gain: 0.14 });
      tone(c, { freq: 2093, start: 0.27, dur: 0.5, gain: 0.04 });
      break;
    case "thud":
      tone(c, { freq: 140, endFreq: 45, dur: 0.22, gain: 0.3 });
      break;
    case "bleat": {
      // a wobbly sawtooth, like a goat that has seen better days
      const t0 = c.currentTime;
      const osc = c.createOscillator();
      const lfo = c.createOscillator();
      const lfoGain = c.createGain();
      const filter = c.createBiquadFilter();
      const g = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(340, t0);
      osc.frequency.linearRampToValueAtTime(260, t0 + 0.5);
      lfo.frequency.value = 28;
      lfoGain.gain.value = 40;
      filter.type = "lowpass";
      filter.frequency.value = 1100;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(filter).connect(g).connect(c.destination);
      osc.start(t0);
      lfo.start(t0);
      osc.stop(t0 + 0.55);
      lfo.stop(t0 + 0.55);
      break;
    }
  }
}
