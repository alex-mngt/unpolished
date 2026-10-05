export type ShortcutEvent = Pick<
  KeyboardEvent,
  "key" | "repeat" | "metaKey" | "ctrlKey" | "altKey" | "target"
>;

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

// Elements where a typed letter belongs to the element, not to the page.
const takesTyping = (target: EventTarget | null) => {
  const element = target as Partial<HTMLInputElement> | null;
  if (!element?.tagName) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
    return true;
  }
  return (
    element.tagName === "INPUT" &&
    !NON_TEXT_INPUT_TYPES.has(element.type ?? "text")
  );
};

export type ShortcutAction = { type: "trigger"; pad: number } | { type: "stop" };

/**
 * One key per pad, in pad order: the two left-hand rows of four keys of an
 * AZERTY keyboard, top row first.
 */
export const PAD_KEYS: readonly string[] = [
  "a",
  "z",
  "e",
  "r",
  "q",
  "s",
  "d",
  "f",
];

/** What a keydown asks for, if it is a deliberate, single press of a shortcut. */
export const shortcutAction = (event: ShortcutEvent): ShortcutAction | null => {
  if (
    // Autofill can dispatch synthetic keydowns that carry no key.
    !event.key ||
    event.repeat ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    takesTyping(event.target)
  ) {
    return null;
  }
  if (event.key === "Escape") return { type: "stop" };
  const pad = PAD_KEYS.indexOf(event.key.toLowerCase());
  return pad === -1 ? null : { type: "trigger", pad };
};
