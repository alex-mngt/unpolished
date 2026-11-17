import { type MidiEnvironment, MidiInputs } from "./inputs";

const browserEnvironment = (): MidiEnvironment => ({
  // No system exclusive, no software synths: pads only need plain messages
  // from real devices.
  requestAccess:
    "requestMIDIAccess" in navigator
      ? () => navigator.requestMIDIAccess()
      : undefined,
  queryPermission:
    "permissions" in navigator
      ? () => navigator.permissions.query({ name: "midi" })
      : undefined,
});

let midi: MidiInputs | null = null;

/**
 * The MIDI inputs of this page, made on first use and shared for the life of
 * the page: the permission is asked for once, and the inputs stay open across
 * navigations. Browser only.
 */
export const getMidi = (): MidiInputs => {
  if (!midi) {
    midi = new MidiInputs(browserEnvironment());
    void midi.start();
  }
  return midi;
};
