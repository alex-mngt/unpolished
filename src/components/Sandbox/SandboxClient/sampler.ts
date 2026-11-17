import { createPulse, type Pulse } from "@/components/Sampler/Pad/pulse";
import { AudioEngine, type AudioInput } from "@/lib/audio/engine";
import { audioLocked } from "@/lib/audio/lock";

import { PAD_KEYS } from "./shortcut";

interface Sampler {
  engine: AudioEngine;
  /** One per pad, in pad order. */
  inputs: readonly AudioInput[];
  /** One per pad, in pad order: fires when its pad is hit, heard or not. */
  pulses: readonly Pulse[];
  /**
   * A hit on a pad, whatever it came from: a key or a MIDI pad. `level` is
   * how hard, 0 to 1, full by default.
   */
  hit: (pad: number, level?: number) => void;
}

let sampler: Sampler | null = null;

/**
 * The engine and its inputs, made on first use and shared by every mount for
 * the life of the page. Nothing closes an AudioContext, so an engine per mount
 * would strand one, decoded samples included, on every visit.
 *
 * It lives in its own module so that Fast Refresh of a component keeps it.
 * What it remembers between mounts (volume, gains, modes, samples) is set
 * again by whoever mounts on it.
 */
export const getSampler = (): Sampler => {
  if (!sampler) {
    const engine = new AudioEngine();
    const inputs = PAD_KEYS.map(() => engine.createInput());
    const pulses = PAD_KEYS.map(() => createPulse());
    const hit = (pad: number, level = 1) => {
      pulses[pad]?.fire();
      // Voices started while the browser holds audio back would pile up, then
      // all sound at once on the first click. A key press is never held back.
      if (!audioLocked()) inputs[pad]?.trigger(level);
    };
    sampler = { engine, inputs, pulses, hit };
  }
  return sampler;
};
