import { AudioEngine, type AudioInput } from "@/lib/audio/engine";

import { PAD_KEYS } from "./shortcut";

interface Sampler {
  engine: AudioEngine;
  /** One per pad, in pad order. */
  inputs: readonly AudioInput[];
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
    sampler = { engine, inputs: PAD_KEYS.map(() => engine.createInput()) };
  }
  return sampler;
};
