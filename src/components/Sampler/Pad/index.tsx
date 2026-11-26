"use client";

import { AudioInput } from "@/lib/audio/engine";
import { Sample } from "@/samples";
import { cn } from "cn";
import { ChangeEvent, FC, useEffect, useRef, useState } from "react";

import { PadSettings } from "./components/PadSettings";
import { usePadForm } from "./form";
import { Pulse } from "./pulse";

interface PadProps {
  input: AudioInput;
  shortcut: string;
  /** The number of the MIDI pad that triggers this one too. */
  midiPad: number;
  /** Fires on every hit: the border flashes, whether or not a sound follows. */
  pulse: Pulse;
  /** Loaded when the pad mounts; the pad starts empty without one. */
  sample?: Sample;
}

// Thickens the 1px border to 4px, inset so that nothing around the pad moves,
// then fades the extra weight out.
const FLASH: Keyframe[] = [
  { boxShadow: "inset 0 0 0 3px currentColor" },
  { boxShadow: "inset 0 0 0 3px transparent" },
];
const FLASH_MS = 200;

export const Pad: FC<PadProps> = ({
  input,
  shortcut,
  midiPad,
  pulse,
  sample,
}) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(sample !== undefined);
  const [error, setError] = useState<string | null>(null);
  const requests = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const form = usePadForm();

  // Animated on the element, with no render: hits can outrun frames.
  useEffect(() => {
    let flash: Animation | undefined;
    const unsubscribe = pulse.subscribe(() => {
      // Each hit starts the flash over.
      flash?.cancel();
      flash = root.current?.animate(FLASH, {
        duration: FLASH_MS,
        easing: "ease-out",
      });
    });
    return () => {
      unsubscribe();
      flash?.cancel();
    };
  }, [pulse]);

  // The input outlives the pad: one that is reused still has the gain and
  // mode of its previous pad, while the form starts over.
  useEffect(() => {
    const { gain, mode } = form.state.values;
    input.setGain(gain);
    input.setMode(mode);
  }, [input, form]);

  useEffect(() => {
    if (!sample) return;
    // A file picked while this is still loading wins, like any later pick.
    const request = ++requests.current;
    const controller = new AbortController();
    const stale = () =>
      controller.signal.aborted || request !== requests.current;
    const load = async () => {
      try {
        const response = await fetch(sample.url, { signal: controller.signal });
        if (!response.ok) throw new Error(response.statusText);
        const data = await response.arrayBuffer();
        if (stale()) return;
        await input.load(data);
        if (stale()) return;
        setFileName(sample.label);
        setError(null);
      } catch {
        if (stale()) return;
        setError("Could not load");
      }
      setLoading(false);
    };
    void load();
    return () => controller.abort();
  }, [input, sample]);

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    // Picks can overlap; only the latest one may report back.
    const request = ++requests.current;
    setLoading(false);
    try {
      const data = await file.arrayBuffer();
      // Checked before decoding too, so the engine sees loads in pick order.
      if (request !== requests.current) return;
      await input.load(data);
      if (request !== requests.current) return;
      setFileName(file.name);
      setError(null);
    } catch {
      if (request !== requests.current) return;
      setError("Could not decode");
    }
  };

  const key = shortcut.toUpperCase();

  return (
    <div
      ref={root}
      className="relative flex flex-col gap-1 min-w-0 border border-foreground rounded-xs p-3"
    >
      <PadSettings
        input={input}
        form={form}
        shortcut={key}
        onSelectFile={selectFile}
        className="absolute top-1 right-1"
      />
      <div className="flex items-baseline gap-2">
        <kbd className="text-4xl font-black uppercase leading-none">{key}</kbd>
        <span className="text-xs uppercase text-muted-foreground">
          Pad {midiPad}
        </span>
      </div>
      <p className={cn("truncate", !fileName && "text-muted-foreground")}>
        {fileName ?? (loading ? "Loading…" : "No sample")}
      </p>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
    </div>
  );
};
