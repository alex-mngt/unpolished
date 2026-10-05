import { describe, expect, test } from "vitest";

import { PAD_KEYS, shortcutAction, ShortcutEvent } from "./shortcut";

const press = (overrides: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key: "a",
  repeat: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  target: null,
  ...overrides,
});

const element = (tagName: string, props: object = {}) =>
  ({ tagName, ...props }) as unknown as EventTarget;

describe("shortcutAction", () => {
  test("triggers the first pad on a plain a press", () => {
    expect(shortcutAction(press())).toEqual({ type: "trigger", pad: 0 });
  });

  test("triggers the second pad on a plain z press", () => {
    expect(shortcutAction(press({ key: "z" }))).toEqual({
      type: "trigger",
      pad: 1,
    });
  });

  test("starts the second row of pads on q", () => {
    expect(shortcutAction(press({ key: "q" }))).toEqual({
      type: "trigger",
      pad: 4,
    });
  });

  test("maps every pad key to its own index", () => {
    PAD_KEYS.forEach((key, pad) => {
      expect(shortcutAction(press({ key }))).toEqual({ type: "trigger", pad });
    });
  });

  test("accepts the letter with shift or caps lock", () => {
    expect(shortcutAction(press({ key: "A" }))).toEqual({
      type: "trigger",
      pad: 0,
    });
  });

  test("stops everything on Escape", () => {
    expect(shortcutAction(press({ key: "Escape" }))).toEqual({ type: "stop" });
  });

  test("ignores other keys", () => {
    expect(shortcutAction(press({ key: "p" }))).toBeNull();
  });

  test("ignores a synthetic event without a key", () => {
    const key = undefined as unknown as string;
    expect(shortcutAction(press({ key }))).toBeNull();
  });

  test("ignores a held key repeating", () => {
    expect(shortcutAction(press({ repeat: true }))).toBeNull();
  });

  test.each(["metaKey", "ctrlKey", "altKey"] as const)(
    "ignores a press with %s held",
    (modifier) => {
      expect(shortcutAction(press({ [modifier]: true }))).toBeNull();
    },
  );

  test.each([
    ["a text input", element("INPUT", { type: "text" })],
    ["a textarea", element("TEXTAREA")],
    ["a select", element("SELECT")],
    ["editable content", element("DIV", { isContentEditable: true })],
  ])("ignores a press typed into %s", (_, target) => {
    expect(shortcutAction(press({ target }))).toBeNull();
    expect(shortcutAction(press({ key: "Escape", target }))).toBeNull();
  });

  test.each([
    ["a file picker", element("INPUT", { type: "file" })],
    ["a range slider", element("INPUT", { type: "range" })],
    ["a button", element("BUTTON")],
  ])("accepts a press while %s has focus", (_, target) => {
    expect(shortcutAction(press({ target }))).toEqual({
      type: "trigger",
      pad: 0,
    });
  });
});
