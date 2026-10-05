import { describe, expect, test } from "vitest";

import {
  advanceNeedle,
  createNeedle,
  MAX_POSITION,
  positionToVu,
} from "./ballistics";

const SAMPLE_RATE = 48000;
const BUFFER_SIZE = 2048;
const TONE_HZ = 1000;

const amplitudeOf = (dbfs: number) => 10 ** (dbfs / 20);

/**
 * Feeds a sine to a needle the way the engine does: once per display frame,
 * with a buffer holding the latest samples and a count of the fresh ones.
 * Returns the needle position after every frame.
 */
const play = (
  needle = createNeedle(),
  {
    amplitude = amplitudeOf(-18),
    durationMs = 1000,
    frameRate = 60,
    referenceDbfs = -18,
  } = {},
) => {
  const buffer = new Float32Array(BUFFER_SIZE);
  const dtMs = 1000 / frameRate;
  // Like the engine, a frame longer than the buffer only sees its tail.
  const fresh = Math.min(BUFFER_SIZE, Math.ceil((dtMs * SAMPLE_RATE) / 1000));
  const trace: { timeMs: number; position: number }[] = [];
  for (let frame = 1; frame * dtMs <= durationMs + 1e-6; frame++) {
    const end = Math.round((frame * dtMs * SAMPLE_RATE) / 1000);
    for (let i = 0; i < BUFFER_SIZE; i++) {
      const sample = end - BUFFER_SIZE + i;
      buffer[i] =
        sample < 0
          ? 0
          : amplitude *
            Math.sin((2 * Math.PI * TONE_HZ * sample) / SAMPLE_RATE);
    }
    const position = advanceNeedle(needle, buffer, fresh, dtMs, referenceDbfs);
    trace.push({ timeMs: frame * dtMs, position });
  }
  return { needle, trace, last: trace[trace.length - 1].position };
};

const firstTimeMs = (
  trace: { timeMs: number; position: number }[],
  reached: (position: number) => boolean,
) => trace.find(({ position }) => reached(position))?.timeMs;

describe("VU needle", () => {
  test("rests on 0 VU for a sine at the reference level", () => {
    const { last } = play(createNeedle(), { durationMs: 2000 });
    expect(positionToVu(last)).toBeCloseTo(0, 1);
  });

  test("reads the level relative to the reference", () => {
    const quieter = play(createNeedle(), {
      amplitude: amplitudeOf(-21),
      durationMs: 2000,
    });
    expect(positionToVu(quieter.last)).toBeCloseTo(-3, 1);

    const hotReference = play(createNeedle(), {
      amplitude: amplitudeOf(-10),
      referenceDbfs: -10,
      durationMs: 2000,
    });
    expect(positionToVu(hotReference.last)).toBeCloseTo(0, 1);
  });

  test("reaches 99% of a suddenly applied tone in 300 ms ±10%", () => {
    const { trace } = play(createNeedle(), { frameRate: 1000 });
    const rise = firstTimeMs(trace, (position) => position >= 0.99);
    expect(rise).toBeGreaterThan(270);
    expect(rise).toBeLessThan(330);
  });

  test("overshoots by 1 to 1.5%", () => {
    const { trace } = play(createNeedle(), { frameRate: 1000 });
    const peak = Math.max(...trace.map(({ position }) => position));
    expect(peak).toBeGreaterThan(1.01);
    expect(peak).toBeLessThan(1.015);
  });

  test("falls back as fast as it rises when the tone stops", () => {
    const { needle } = play(createNeedle(), { durationMs: 2000 });
    const { trace, last } = play(needle, { amplitude: 0, frameRate: 1000 });
    const fall = firstTimeMs(trace, (position) => position <= 0.01);
    expect(fall).toBeGreaterThan(270);
    expect(fall).toBeLessThan(330);
    expect(last).toBeCloseTo(0, 3);
  });

  test("moves the same at 60 Hz and 120 Hz, and across a long frame", () => {
    const at60 = play(createNeedle(), { durationMs: 200, frameRate: 60 });
    const at120 = play(createNeedle(), { durationMs: 200, frameRate: 120 });
    const at10 = play(createNeedle(), { durationMs: 200, frameRate: 10 });
    expect(at120.last).toBeCloseTo(at60.last, 2);
    expect(at10.last).toBeCloseTo(at60.last, 2);
  });

  test("stops at the end of its travel and recovers", () => {
    const needle = createNeedle();
    const pinned = play(needle, { amplitude: 1 });
    expect(pinned.last).toBe(MAX_POSITION);
    const released = play(needle, { amplitude: 0 });
    expect(released.last).toBeCloseTo(0, 3);
  });
});
