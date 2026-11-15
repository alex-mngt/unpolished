import * as z from "zod";

import { numberField } from "@/lib/form/number";

import type { NeedleConfig } from "./ballistics";
import type { FaceConfig } from "./draw";

export const vuMeterConfigSchema = z.object({
  /** Peak level of the sine that reads 0 VU. */
  referenceDbfs: numberField({
    title: "Reference",
    description:
      "Level that reads 0 VU. Lower makes the needles sit higher for the same sound, higher keeps them lower.",
    unit: "dBFS",
    min: -40,
    max: 0,
    step: 1,
  }),
  // The overshoot depends only on the damping ratio: about 1.3% at 0.81.
  damping: numberField({
    title: "Damping",
    description:
      "How the needle settles on a level. Lower lets it overshoot and bounce, higher makes it slow and steady.",
    min: 0.1,
    max: 2,
    step: 0.01,
  }),
  /** How long a step takes to reach 99%. */
  settleMs: numberField({
    title: "Settle time",
    description:
      "How long the needle takes to reach a new level. Shorter makes it snappy, longer makes it lazy.",
    unit: "ms",
    min: 50,
    max: 2000,
    step: 10,
  }),
  /** The right-hand mechanical stop, as a voltage ratio (1.5 is about +3.5 VU). */
  maxPosition: numberField({
    title: "Needle stop",
    description:
      "Where the needle hits its right-hand stop. Higher adds more scale above 0 VU before it pins.",
    min: 1,
    max: 3,
    step: 0.1,
  }),
  /** Angle between the vertical and either end of the scale. */
  halfSweepDeg: numberField({
    title: "Half sweep",
    description:
      "How far the needle swings from vertical to either end of the scale. Larger gives a wider arc.",
    unit: "°",
    min: 10,
    max: 80,
    step: 1,
  }),
});

export type VUMeterConfig = z.infer<typeof vuMeterConfigSchema>;

// The pure modules spell out what they need; the schema must cover it.
export const DEFAULT_VU_METER_CONFIG: VUMeterConfig = {
  referenceDbfs: -8,
  damping: 0.81,
  settleMs: 300,
  maxPosition: 1.5,
  halfSweepDeg: 40,
} satisfies NeedleConfig & FaceConfig;
