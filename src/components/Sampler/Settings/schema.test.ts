import { describe, expect, test } from "vitest";
import * as z from "zod";

import { numberSpec } from "@/lib/form/number";

import { DEFAULT_SETTINGS, settingsSchema } from "./schema";

const issuePaths = (value: unknown) => {
  const result = settingsSchema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
};

describe("settings schema", () => {
  test("accepts the defaults unchanged", () => {
    expect(settingsSchema.parse(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  test("names the field an empty input leaves as NaN", () => {
    const value = structuredClone(DEFAULT_SETTINGS);
    value.engine.limiterAttackMs = NaN;
    expect(issuePaths(value)).toEqual(["engine.limiterAttackMs"]);
  });

  test("rejects a value past its range, and only that one", () => {
    const value = structuredClone(DEFAULT_SETTINGS);
    value.vu.referenceDbfs = 1;
    value.goniometer.gridAlpha = -0.1;
    expect(issuePaths(value)).toEqual([
      "goniometer.gridAlpha",
      "vu.referenceDbfs",
    ]);
  });

  test("rejects a fractional voice count and an odd FFT size", () => {
    const value = structuredClone(DEFAULT_SETTINGS);
    value.engine.maxVoices = 2.5;
    // Typed as a literal union, so it has to be smuggled in.
    (value.engine as { fftSize: number }).fftSize = 1000;
    expect(issuePaths(value)).toEqual(["engine.maxVoices", "engine.fftSize"]);
  });

  test("the FFT size carries a hint like the number fields", () => {
    const meta = settingsSchema.shape.engine.shape.fftSize.meta();
    expect(meta?.title).toBe("FFT size");
    expect(meta?.description).toMatch(/\S/);
  });

  test("every number field carries what the form needs to render it", () => {
    for (const section of Object.values(settingsSchema.shape)) {
      for (const [key, field] of Object.entries(section.shape)) {
        if (!(field instanceof z.ZodNumber)) continue;
        const spec = numberSpec(field);
        expect(spec.title, key).not.toBe("");
        expect(spec.description, key).toMatch(/\S/);
        expect(spec.min, key).toBeLessThan(spec.max);
        expect(spec.step, key).toBeGreaterThan(0);
      }
    }
  });
});
