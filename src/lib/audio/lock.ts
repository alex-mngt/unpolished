import { useSyncExternalStore } from "react";

/**
 * Whether the browser still refuses to start audio: it waits for a click or
 * a key press on the page, and a MIDI message is neither. A browser that
 * cannot tell is taken to be unlocked.
 */
export const audioLocked = () =>
  navigator.userActivation?.hasBeenActive === false;

// Every event the browser counts as the user acting on the page.
const GESTURES = ["keydown", "mousedown", "pointerdown", "pointerup", "touchend"];

const subscribe = (listener: () => void) => {
  const controller = new AbortController();
  for (const gesture of GESTURES) {
    window.addEventListener(gesture, listener, {
      capture: true,
      passive: true,
      signal: controller.signal,
    });
  }
  return () => controller.abort();
};

// The server cannot know, and saying "locked" would flash a hint at everyone.
const serverSnapshot = () => false;

/** `audioLocked`, re-read on every gesture. */
export const useAudioLocked = () =>
  useSyncExternalStore(subscribe, audioLocked, serverSnapshot);
