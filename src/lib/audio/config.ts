import * as z from "zod";

import { integerField, numberField } from "@/lib/form/number";

/** Analyser sizes on offer; the Web Audio API wants a power of two. */
export const FFT_SIZES = [256, 512, 1024, 2048, 4096, 8192] as const;

/** Everything the engine can be tuned with, in the units a person thinks in. */
export const engineConfigSchema = z.object({
  // Trim applied to the sum; the limiter takes care of the rest.
  headroomDb: numberField({
    title: "Headroom",
    description:
      "Turns the whole mix down before the limiter. Lower leaves more room, so the limiter kicks in less often when many pads sound at once.",
    unit: "dB",
    min: -24,
    max: 0,
    step: 0.5,
  }),
  // A soft knee that ends at full scale, so the limiter eases in instead of
  // clamping. It is not a brick wall: a transient can still get past it
  // during the attack.
  limiterThresholdDb: numberField({
    title: "Threshold",
    description:
      "Level where the limiter starts holding the mix back. Lower tames peaks sooner but squashes more of the sound.",
    unit: "dB",
    min: -60,
    max: 0,
    step: 1,
  }),
  limiterKneeDb: numberField({
    title: "Knee",
    description:
      "How gradually the limiter eases in around the threshold. Wider sounds smoother, narrower sounds harder.",
    unit: "dB",
    min: 0,
    max: 40,
    step: 1,
  }),
  limiterRatio: numberField({
    title: "Ratio",
    description:
      "How firmly peaks above the threshold are held down. Higher flattens them more, lower lets them through.",
    unit: ": 1",
    min: 1,
    max: 20,
    step: 0.5,
  }),
  limiterAttackMs: numberField({
    title: "Attack",
    description:
      "How fast the limiter reacts to a peak. Shorter catches hits sooner, longer lets the first snap of a hit through.",
    unit: "ms",
    min: 0,
    max: 1000,
    step: 1,
  }),
  limiterReleaseMs: numberField({
    title: "Release",
    description:
      "How long the limiter takes to let go after a peak. Shorter can pump audibly, longer keeps the mix ducked.",
    unit: "ms",
    min: 0,
    max: 1000,
    step: 10,
  }),
  /** Voices one input can sound at once in poly mode; the oldest is stolen. */
  maxVoices: integerField({
    title: "Max voices",
    description:
      "How many times one pad can sound at once in poly mode. When it is full, the oldest voice is cut to make room.",
    min: 1,
    max: 32,
    step: 1,
  }),
  // Long enough that a voice cut mid-waveform does not click.
  chokeFadeMs: numberField({
    title: "Choke fade",
    description:
      "How quickly a voice is faded out when it is cut off. Longer avoids clicks, shorter sounds tighter.",
    unit: "ms",
    min: 1,
    max: 100,
    step: 1,
  }),
  // Time constant gain changes glide with, so dragging a slider does not zip.
  gainGlideMs: numberField({
    title: "Gain glide",
    description:
      "How smoothly a gain change settles in. Higher stops sliders from zipping, lower reacts faster.",
    unit: "ms",
    min: 0,
    max: 200,
    step: 1,
  }),
  fftSize: z.literal(FFT_SIZES).meta({
    title: "FFT size",
    description:
      "How much audio each analysis frame looks at. Larger makes the goniometer trace denser and smoother; smaller follows fast changes more closely.",
  }),
  // Keep ticking this long after the last voice ends so traces can fade out
  // and needles can fall back to rest.
  tailMs: numberField({
    title: "Tail",
    description:
      "How long the meters keep running after the last sound ends, so traces can fade and needles can fall back to rest.",
    unit: "ms",
    min: 0,
    max: 10000,
    step: 100,
  }),
});

export type EngineConfig = z.infer<typeof engineConfigSchema>;

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  headroomDb: -3,
  limiterThresholdDb: -6,
  limiterKneeDb: 6,
  limiterRatio: 8,
  limiterAttackMs: 3,
  limiterReleaseMs: 250,
  maxVoices: 8,
  chokeFadeMs: 5,
  gainGlideMs: 10,
  fftSize: 2048,
  tailMs: 1500,
};
