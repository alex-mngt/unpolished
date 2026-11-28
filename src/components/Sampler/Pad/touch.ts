/** What decides whether a pointerdown on a pad plays it. */
export type PadPointerEvent = Pick<
  PointerEvent,
  "pointerType" | "button" | "target" | "currentTarget"
>;

// Controls inside a pad, such as its settings button, keep their touches.
const CONTROLS = "button, a, input, select, textarea, label";

/**
 * Whether a pointerdown is a finger or a pen landing on the pad itself. A
 * mouse click does not play it: on a computer, the keys do. Neither does a
 * press that React bubbles up from a portal, such as the settings popover,
 * which sits outside the pad in the page.
 */
export const touchHits = (event: PadPointerEvent): boolean => {
  if (event.pointerType === "mouse" || event.button !== 0) return false;
  const target = event.target as Element | null;
  const pad = event.currentTarget as Element | null;
  if (!target?.closest || !pad?.contains(target)) return false;
  return target.closest(CONTROLS) === null;
};

/**
 * Calls `onLift` once the pointer `pointerId` lifts, unless the browser takes
 * the gesture over first, for a scroll or a zoom.
 */
export const whenLifted = (pointerId: number, onLift: () => void) => {
  const controller = new AbortController();
  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    controller.abort();
    if (event.type === "pointerup") onLift();
  };
  const options = { capture: true, signal: controller.signal };
  window.addEventListener("pointerup", end, options);
  window.addEventListener("pointercancel", end, options);
};
