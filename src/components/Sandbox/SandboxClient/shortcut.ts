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

/** Whether a keydown is a deliberate, single press of the play key. */
export const isPlayShortcut = (event: ShortcutEvent) =>
  // Autofill can dispatch synthetic keydowns that carry no key.
  event.key?.toLowerCase() === "a" &&
  !event.repeat &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !takesTyping(event.target);
