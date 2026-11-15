import * as z from "zod";

import { numberField } from "@/lib/form/number";

export const goniometerConfigSchema = z.object({
  /** Dot edge length in CSS pixels. */
  dotSize: numberField({
    title: "Dot size",
    description:
      "Size of each point in the trace. Larger makes it bold and blurry, smaller makes it fine and faint.",
    unit: "px",
    min: 0.5,
    max: 6,
    step: 0.5,
  }),
  /** Time constant of the fade: the trace is at ~5% after three of these. */
  fadeMs: numberField({
    title: "Trace fade",
    description:
      "How long each point lingers before fading out. Longer leaves a glowing trail, shorter shows only the latest shape.",
    unit: "ms",
    min: 10,
    max: 2000,
    step: 10,
  }),
  /** Space kept around the full-scale diamond for the axis letters. */
  padding: numberField({
    title: "Padding",
    description:
      "Space kept between the full-scale diamond and the edge, so the axis letters have room.",
    unit: "px",
    min: 0,
    max: 40,
    step: 1,
  }),
  gridAlpha: numberField({
    title: "Grid opacity",
    description:
      "How visible the axes and diamond are behind the trace. Zero hides them.",
    min: 0,
    max: 1,
    step: 0.05,
  }),
});

export type GoniometerConfig = z.infer<typeof goniometerConfigSchema>;

export const DEFAULT_GONIOMETER_CONFIG: GoniometerConfig = {
  dotSize: 1.5,
  fadeMs: 100,
  padding: 14,
  gridAlpha: 0.3,
};
