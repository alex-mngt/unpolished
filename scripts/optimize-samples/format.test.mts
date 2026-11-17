import { describe, expect, test } from "vitest";

import { targetFormat } from "./format.mts";

describe("targetFormat", () => {
  test("keeps 16-bit PCM bit for bit", () => {
    expect(targetFormat("pcm_s16le")).toEqual({
      bits: 16,
      exact: true,
      float: false,
    });
  });

  test("keeps 24-bit PCM bit for bit", () => {
    expect(targetFormat("pcm_s24le")).toEqual({
      bits: 24,
      exact: true,
      float: false,
    });
  });

  test("brings 32-bit integers down to 24 bits, the most a browser plays back", () => {
    expect(targetFormat("pcm_s32le")).toEqual({
      bits: 24,
      exact: false,
      float: false,
    });
  });

  test.each(["pcm_f32le", "pcm_f64le"])(
    "brings %s down to 24 bits, and flags it as able to exceed full scale",
    (codec) => {
      expect(targetFormat(codec)).toEqual({
        bits: 24,
        exact: false,
        float: true,
      });
    },
  );

  test.each(["pcm_u8", "pcm_alaw", "adpcm_ms", "mp3"])(
    "refuses %s rather than convert it silently",
    (codec) => {
      expect(() => targetFormat(codec)).toThrow(codec);
    },
  );
});
