import { describe, expect, test } from "vitest";

import { flacName, wavSources } from "./sources.mts";

describe("flacName", () => {
  test("swaps the extension, whatever its case", () => {
    expect(flacName("FX_Ah.wav")).toBe("FX_Ah.flac");
    expect(flacName("FX_Ah.WAV")).toBe("FX_Ah.flac");
  });

  test("keeps the spaces and dots of a name", () => {
    expect(flacName("FX_ring alarm_185bpm.wav")).toBe(
      "FX_ring alarm_185bpm.flac",
    );
    expect(flacName("kick.v2.wav")).toBe("kick.v2.flac");
  });
});

describe("wavSources", () => {
  test("lists the WAV files in a stable order", () => {
    expect(wavSources(["FX_hum.wav", "FX_Ah.wav", "FX_apollo.WAV"])).toEqual([
      "FX_Ah.wav",
      "FX_apollo.WAV",
      "FX_hum.wav",
    ]);
  });

  test("ignores dotfiles", () => {
    expect(wavSources([".DS_Store", "FX_Ah.wav"])).toEqual(["FX_Ah.wav"]);
  });

  test("refuses a file it would otherwise skip silently", () => {
    expect(() => wavSources(["FX_Ah.wav", "FX_hum.aif"])).toThrow(
      "FX_hum.aif",
    );
  });

  test("refuses two sources that land on the same FLAC", () => {
    expect(() => wavSources(["FX_Ah.wav", "fx_ah.WAV"])).toThrow(
      /FX_Ah\.wav.*fx_ah\.WAV/,
    );
  });
});
