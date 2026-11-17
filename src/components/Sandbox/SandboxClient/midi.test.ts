import { describe, expect, test } from "vitest";

import { midiAction, MPD_PADS, velocityLevel } from "./midi";
import { PAD_KEYS } from "./shortcut";

const message = (...bytes: number[]) => Uint8Array.from(bytes);

/** A pad hit as the MPD218 sends it: Note On, channel 10. */
const hit = (note: number, velocity = 100) => message(0x99, note, velocity);

describe("midiAction", () => {
  test("triggers the first screen pad from MPD pad 5", () => {
    expect(midiAction(hit(40, 100))).toEqual({
      type: "trigger",
      pad: 0,
      velocity: 100,
    });
  });

  test("starts the second screen row from MPD pad 1", () => {
    expect(midiAction(hit(36))).toMatchObject({ type: "trigger", pad: 4 });
  });

  test.each([
    [40, 0],
    [41, 1],
    [42, 2],
    [43, 3],
    [36, 4],
    [37, 5],
    [38, 6],
    [39, 7],
  ])("maps note %i to screen pad %i", (note, pad) => {
    expect(midiAction(hit(note))).toMatchObject({ pad });
  });

  test.each([0x90, 0x99, 0x9f])("hears channel status %i", (status) => {
    expect(midiAction(message(status, 40, 100))).toMatchObject({ pad: 0 });
  });

  test("carries how hard the pad was hit", () => {
    expect(midiAction(hit(40, 1))).toMatchObject({ velocity: 1 });
    expect(midiAction(hit(40, 127))).toMatchObject({ velocity: 127 });
  });

  test("ignores a release sent as a Note On of velocity 0", () => {
    expect(midiAction(hit(40, 0))).toBeNull();
  });

  test("ignores a Note Off", () => {
    expect(midiAction(message(0x89, 40, 64))).toBeNull();
  });

  test.each([
    ["pad pressure", message(0xa9, 40, 90)],
    ["channel pressure", message(0xd9, 90)],
    ["a knob", message(0xb0, 40, 100)],
    ["a program change", message(0xc9, 40)],
    ["a clock tick", message(0xf8)],
  ])("ignores %s", (_, data) => {
    expect(midiAction(data)).toBeNull();
  });

  test.each([35, 44, 51, 52])(
    "ignores note %i, which has no screen pad",
    (note) => {
      expect(midiAction(hit(note))).toBeNull();
    },
  );

  test("ignores a message that was cut short", () => {
    expect(midiAction(message(0x99, 40))).toBeNull();
    expect(midiAction(message())).toBeNull();
  });
});

describe("MPD_PADS", () => {
  test("has one row per screen pad", () => {
    expect(MPD_PADS).toHaveLength(PAD_KEYS.length);
  });

  test("numbers the screen pads like the bottom two rows of the MPD", () => {
    expect(MPD_PADS.map((pad) => pad.number)).toEqual([5, 6, 7, 8, 1, 2, 3, 4]);
  });
});

describe("velocityLevel", () => {
  test("plays the hardest hit at full level", () => {
    expect(velocityLevel(127)).toBe(1);
  });

  test("plays a hit of half the strength at half the level", () => {
    expect(velocityLevel(63.5)).toBe(0.5);
  });
});
