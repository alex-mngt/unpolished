import { describe, expect, test } from "vitest";

import { isPlayShortcut, ShortcutEvent } from "./shortcut";

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

describe("isPlayShortcut", () => {
  test("accepts a plain a press", () => {
    expect(isPlayShortcut(press())).toBe(true);
  });

  test("accepts the letter with shift or caps lock", () => {
    expect(isPlayShortcut(press({ key: "A" }))).toBe(true);
  });

  test("rejects other keys", () => {
    expect(isPlayShortcut(press({ key: "s" }))).toBe(false);
  });

  test("rejects a synthetic event without a key", () => {
    const key = undefined as unknown as string;
    expect(isPlayShortcut(press({ key }))).toBe(false);
  });

  test("rejects a held key repeating", () => {
    expect(isPlayShortcut(press({ repeat: true }))).toBe(false);
  });

  test.each(["metaKey", "ctrlKey", "altKey"] as const)(
    "rejects a press with %s held",
    (modifier) => {
      expect(isPlayShortcut(press({ [modifier]: true }))).toBe(false);
    },
  );

  test.each([
    ["a text input", element("INPUT", { type: "text" })],
    ["a textarea", element("TEXTAREA")],
    ["a select", element("SELECT")],
    ["editable content", element("DIV", { isContentEditable: true })],
  ])("rejects a press typed into %s", (_, target) => {
    expect(isPlayShortcut(press({ target }))).toBe(false);
  });

  test.each([
    ["a radio", element("INPUT", { type: "radio" })],
    ["a range slider", element("INPUT", { type: "range" })],
    ["a button", element("BUTTON")],
  ])("accepts a press while %s has focus", (_, target) => {
    expect(isPlayShortcut(press({ target }))).toBe(true);
  });
});
