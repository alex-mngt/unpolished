import { describe, expect, test } from "vitest";

import { PadPointerEvent, touchHits } from "./touch";

interface TargetProps {
  /** Inside a control of the pad, such as its settings button. */
  inControl?: boolean;
  /** Outside the pad in the page, as in a portal. */
  outside?: boolean;
}

const target = ({ inControl = false, outside = false }: TargetProps = {}) => {
  const node = { closest: () => (inControl ? {} : null), outside };
  return node as unknown as EventTarget;
};

const pad = {
  contains: (node: { outside: boolean }) => !node.outside,
} as unknown as EventTarget;

const press = (
  overrides: Partial<PadPointerEvent> = {},
  props?: TargetProps,
): PadPointerEvent => ({
  pointerType: "touch",
  button: 0,
  target: target(props),
  currentTarget: pad,
  ...overrides,
});

describe("touchHits", () => {
  test("hits on a finger landing on the pad", () => {
    expect(touchHits(press())).toBe(true);
  });

  test("hits on a pen landing on the pad", () => {
    expect(touchHits(press({ pointerType: "pen" }))).toBe(true);
  });

  test("ignores a mouse click, which the keys stand in for", () => {
    expect(touchHits(press({ pointerType: "mouse" }))).toBe(false);
  });

  test("ignores a pen pressed with its barrel button or eraser", () => {
    expect(touchHits(press({ pointerType: "pen", button: 2 }))).toBe(false);
    expect(touchHits(press({ pointerType: "pen", button: 5 }))).toBe(false);
  });

  test("leaves the pad's own controls to themselves", () => {
    expect(touchHits(press({}, { inControl: true }))).toBe(false);
  });

  test("ignores a press bubbled up from a portal outside the pad", () => {
    expect(touchHits(press({}, { outside: true }))).toBe(false);
  });

  test("ignores a press with no element to land on", () => {
    expect(touchHits(press({ target: null }))).toBe(false);
  });
});
