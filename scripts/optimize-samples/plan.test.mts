import { describe, expect, test } from "vitest";

import { plan } from "./plan.mts";
import type { Disk, Lock } from "./plan.mts";

const ENCODER = "-c:a flac";

/** One sample, converted and recorded: nothing left to do. */
const settled = (): { disk: Disk; lock: Lock } => ({
  disk: {
    sources: { "FX_Ah.wav": "wav-1" },
    flacs: { "FX_Ah.flac": "flac-1" },
  },
  lock: {
    encoder: ENCODER,
    samples: { "FX_Ah.wav": { source: "wav-1", flac: "flac-1" } },
  },
});

describe("plan", () => {
  test("leaves a sample alone once it is converted and recorded", () => {
    const { disk, lock } = settled();
    expect(plan(disk, lock, ENCODER)).toEqual({ encode: [], prune: [] });
  });

  test("encodes a new sample", () => {
    const { disk, lock } = settled();
    disk.sources = { ...disk.sources, "FX_hum.wav": "wav-2" };
    expect(plan(disk, lock, ENCODER)).toEqual({
      encode: ["FX_hum.wav"],
      prune: [],
    });
  });

  test("encodes everything on a first run, in a stable order", () => {
    const disk = {
      sources: { "FX_hum.wav": "wav-2", "FX_Ah.wav": "wav-1" },
      flacs: {},
    };
    expect(plan(disk, { encoder: ENCODER, samples: {} }, ENCODER)).toEqual({
      encode: ["FX_Ah.wav", "FX_hum.wav"],
      prune: [],
    });
  });

  test("encodes a sample whose WAV was replaced", () => {
    const { disk, lock } = settled();
    disk.sources = { "FX_Ah.wav": "wav-1-replaced" };
    expect(plan(disk, lock, ENCODER).encode).toEqual(["FX_Ah.wav"]);
  });

  test("encodes a sample whose FLAC went missing", () => {
    const { disk, lock } = settled();
    disk.flacs = {};
    expect(plan(disk, lock, ENCODER).encode).toEqual(["FX_Ah.wav"]);
  });

  test("encodes a sample whose FLAC is not the one recorded", () => {
    const { disk, lock } = settled();
    disk.flacs = { "FX_Ah.flac": "flac-edited" };
    expect(plan(disk, lock, ENCODER).encode).toEqual(["FX_Ah.wav"]);
  });

  test("encodes everything again when the encoder settings change", () => {
    const { disk, lock } = settled();
    expect(plan(disk, lock, "-c:a flac -compression_level 12").encode).toEqual(
      ["FX_Ah.wav"],
    );
  });

  test("prunes the FLAC of a sample whose WAV is gone", () => {
    const { disk, lock } = settled();
    disk.flacs = { ...disk.flacs, "FX_hum.flac": "flac-2" };
    expect(plan(disk, lock, ENCODER)).toEqual({
      encode: [],
      prune: ["FX_hum.flac"],
    });
  });
});
