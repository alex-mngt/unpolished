"use client";

import { AudioInput } from "@/lib/audio/engine";
import { Sample } from "@/samples";
import { cn } from "cn";
import { ChangeEvent, FC, useEffect, useRef, useState } from "react";

import { PadSettings } from "./components/PadSettings";
import { usePadForm } from "./form";

interface PadProps {
  input: AudioInput;
  shortcut: string;
  /** Loaded when the pad mounts; the pad starts empty without one. */
  sample?: Sample;
}

export const Pad: FC<PadProps> = ({ input, shortcut, sample }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(sample !== undefined);
  const [error, setError] = useState<string | null>(null);
  const requests = useRef(0);
  const form = usePadForm();

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
    <div className="relative flex flex-col gap-1 min-w-0 border border-foreground rounded-xs p-3">
      <PadSettings
        input={input}
        form={form}
        shortcut={key}
        onSelectFile={selectFile}
        className="absolute top-1 right-1"
      />
      <kbd className="text-4xl font-black uppercase leading-none">{key}</kbd>
      <p className={cn("truncate", !fileName && "text-muted-foreground")}>
        {fileName ?? (loading ? "Loading…" : "No sample")}
      </p>
      {error && (
        <p role="alert" className="text-(--danger)">
          {error}
        </p>
      )}
    </div>
  );
};
