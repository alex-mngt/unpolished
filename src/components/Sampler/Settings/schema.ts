import * as z from "zod";

import {
  DEFAULT_GONIOMETER_CONFIG,
  goniometerConfigSchema,
} from "@/components/Visualizers/Goniometer/config";
import {
  DEFAULT_VU_METER_CONFIG,
  vuMeterConfigSchema,
} from "@/components/Visualizers/VUMeter/config";
import { DEFAULT_ENGINE_CONFIG, engineConfigSchema } from "@/lib/audio/config";

/** Every knob of the sampler, grouped by the module that owns it. */
export const settingsSchema = z.object({
  engine: engineConfigSchema,
  goniometer: goniometerConfigSchema,
  vu: vuMeterConfigSchema,
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  engine: DEFAULT_ENGINE_CONFIG,
  goniometer: DEFAULT_GONIOMETER_CONFIG,
  vu: DEFAULT_VU_METER_CONFIG,
};
