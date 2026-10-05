import { describe, expect, test } from "vitest";

import { sampleLabel, SAMPLES, sortByFileName } from ".";

describe("sampleLabel", () => {
  test("drops the prefix and the extension", () => {
    expect(sampleLabel("FX_Ah.wav")).toBe("Ah");
  });

  test("keeps the tempo, spaced from the name", () => {
    expect(sampleLabel("FX_apollo_106bpm.wav")).toBe("apollo 106bpm");
  });

  test("keeps the spaces of a name", () => {
    expect(sampleLabel("FX_stut bass_120bpm.wav")).toBe("stut bass 120bpm");
  });

  test("leaves a name without the prefix alone", () => {
    expect(sampleLabel("kick.wav")).toBe("kick");
  });
});

describe("sortByFileName", () => {
  test("orders alphabetically, whatever the case", () => {
    const files = ["FX_hum.wav", "FX_apollo_106bpm.wav", "FX_Ah.wav"].map(
      (fileName) => ({ fileName }),
    );
    expect(sortByFileName(files).map(({ fileName }) => fileName)).toEqual([
      "FX_Ah.wav",
      "FX_apollo_106bpm.wav",
      "FX_hum.wav",
    ]);
  });

  test("leaves the given list untouched", () => {
    const files = [{ fileName: "b.wav" }, { fileName: "a.wav" }];
    sortByFileName(files);
    expect(files[0].fileName).toBe("b.wav");
  });
});

describe("SAMPLES", () => {
  test("lists the bundled samples in pad order", () => {
    expect(SAMPLES.map(({ label }) => label)).toEqual([
      "Ah",
      "apollo 106bpm",
      "hum",
      "like 120bpm",
      "mask 140bpm",
      "phone 116bpm",
      "ring alarm 185bpm",
      "stut bass 120bpm",
    ]);
  });
});
