"use client";

import { Button } from "@/components/UI/Button";
import { useAudioLocked } from "@/lib/audio/lock";
import { getMidi } from "@/lib/midi/browser";
import { INITIAL_MIDI_STATE } from "@/lib/midi/inputs";
import { FC, ReactNode, useSyncExternalStore } from "react";

const subscribe = (listener: () => void) => getMidi().subscribe(listener);
const getState = () => getMidi().getState();
// The server knows nothing about the browser's MIDI; neither does the first
// render in the browser, which has to match it.
const getServerState = () => INITIAL_MIDI_STATE;

/** "MPD218 +1": the first input by name, the others by count. */
const deviceLabel = ([first, ...others]: readonly string[]) => {
  if (first === undefined) return "no device";
  return others.length === 0 ? first : `${first} +${others.length}`;
};

const connect = () => void getMidi().connect();

const BUTTON_SIZE = "text-sm py-1 px-2";

/**
 * Where MIDI stands, and the one button that asks the browser for it. The
 * browser remembers the answer: once granted, there is nothing left to click
 * and devices come and go on their own.
 */
export const MidiConnect: FC = () => {
  const { status, inputs } = useSyncExternalStore(
    subscribe,
    getState,
    getServerState,
  );
  const locked = useAudioLocked();

  let control: ReactNode;
  let hint: string | null = null;
  switch (status) {
    case "pending":
      control = <p className="text-muted-foreground">MIDI…</p>;
      break;
    case "unsupported":
      control = (
        <Button disabled className={BUTTON_SIZE}>
          Connect MIDI
        </Button>
      );
      hint = "this browser has no Web MIDI";
      break;
    case "prompt":
      control = (
        <Button onClick={connect} className={BUTTON_SIZE}>
          Connect MIDI
        </Button>
      );
      break;
    case "granted":
      control = <p>MIDI: {deviceLabel(inputs)}</p>;
      // A MIDI pad is not a gesture: the browser keeps audio off until one.
      if (locked && inputs.length > 0) hint = "click or press a key for sound";
      break;
    case "denied":
      control = <p>MIDI blocked</p>;
      hint = "allow MIDI devices for this site in the browser settings";
      break;
    case "unavailable":
      control = (
        <Button onClick={connect} className={BUTTON_SIZE}>
          MIDI unavailable
        </Button>
      );
      hint = "click to try again";
      break;
  }

  return (
    <div role="status" className="flex items-center gap-2">
      {control}
      {hint && <p className="text-muted-foreground">· {hint}</p>}
    </div>
  );
};
