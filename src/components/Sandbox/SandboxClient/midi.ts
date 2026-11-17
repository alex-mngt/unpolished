interface MpdPad {
  /** The number printed on the MPD pad. */
  number: number;
  /** The note that pad sends. */
  note: number;
}

/**
 * The MPD218 pad behind each screen pad, in screen pad order. The screen
 * mirrors the bottom two rows of the MPD, whose pads count up from the
 * bottom left: pads 5 to 8 sit above pads 1 to 4.
 *
 * The notes are the ones heard from the device itself, on pad bank A and
 * channel 10: pad 1 sends note 36 and each pad is one note up, to pad 16 on
 * note 51. The other pads and banks are left alone.
 */
export const MPD_PADS: readonly MpdPad[] = [
  { number: 5, note: 40 },
  { number: 6, note: 41 },
  { number: 7, note: 42 },
  { number: 8, note: 43 },
  { number: 1, note: 36 },
  { number: 2, note: 37 },
  { number: 3, note: 38 },
  { number: 4, note: 39 },
];

export interface MidiAction {
  type: "trigger";
  /** Index of the screen pad, like the one of a `ShortcutAction`. */
  pad: number;
  /** How hard the pad was hit, 1 to 127. */
  velocity: number;
}

const NOTE_ON = 0x90;

/**
 * What a MIDI message asks for, if it is a pad going down. Any channel will
 * do. Releases, pressure and knobs ask for nothing: a sample plays out.
 */
export const midiAction = (data: Uint8Array): MidiAction | null => {
  if (data.length < 3) return null;
  const [status, note, velocity] = data;
  // The low four bits are the channel. A Note On of velocity 0 is a release.
  if ((status & 0xf0) !== NOTE_ON || velocity === 0) return null;
  const pad = MPD_PADS.findIndex((row) => row.note === note);
  return pad === -1 ? null : { type: "trigger", pad, velocity };
};

/**
 * The level a hit of this velocity plays at, 0 to 1. Linear: the pads of the
 * MPD218 are stiff, and a steeper curve leaves an ordinary hit too quiet.
 */
export const velocityLevel = (velocity: number) => velocity / 127;
