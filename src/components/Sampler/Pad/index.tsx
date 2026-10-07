"use client";

import { Field, FieldLabel } from "@/components/shadcn/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Slider } from "@/components/shadcn/slider";
import { AudioInput, InputMode } from "@/lib/audio/engine";
import { Sample } from "@/samples";
import { useForm } from "@tanstack/react-form";
import { ChangeEvent, FC, useEffect, useId, useRef, useState } from "react";

const MODES: { value: InputMode; label: string }[] = [
  { value: "mono", label: "Mono" },
  { value: "poly", label: "Poly" },
];

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
  const id = useId();

  // Live controls: every change goes straight to the engine, nothing to submit.
  const form = useForm({
    defaultValues: {
      gain: 1,
      mode: "mono" as InputMode,
    },
  });

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
        setError(`Could not load ${sample.label}`);
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
      setError(`Could not decode ${file.name}`);
    }
  };

  const key = shortcut.toUpperCase();
  const gainLabelId = `${id}-gain-label`;
  const modeId = `${id}-mode`;

  return (
    <fieldset className="flex flex-col gap-3 min-w-0 border border-foreground rounded-xs p-3">
      <legend className="px-1">
        Pad <kbd>{key}</kbd>
      </legend>
      <input
        type="file"
        accept="audio/*"
        aria-label={`Audio file for pad ${key}`}
        onChange={selectFile}
        className="w-full"
      />
      <p>
        {fileName ? (
          <>
            {fileName}: press <kbd>{key}</kbd> to play
          </>
        ) : loading ? (
          "Loading…"
        ) : (
          "No sample loaded"
        )}
      </p>
      {error && (
        <p role="alert" className="text-(--danger)">
          {error}
        </p>
      )}
      <form
        onSubmit={(event) => event.preventDefault()}
        className="flex flex-wrap items-center gap-3"
      >
        <form.Field
          name="gain"
          listeners={{ onChange: ({ value }) => input.setGain(value) }}
        >
          {(field) => (
            <Field orientation="horizontal" className="flex-1 min-w-40">
              <FieldLabel id={gainLabelId} className="flex-none!">
                Gain
              </FieldLabel>
              <Slider
                aria-labelledby={gainLabelId}
                min={0}
                max={1}
                step={0.01}
                value={[field.state.value]}
                // The wrapper's types lose the single-thumb shape.
                onValueChange={(value) =>
                  field.handleChange(Array.isArray(value) ? value[0] : value)
                }
                className="flex-1 min-w-0"
              />
            </Field>
          )}
        </form.Field>
        <form.Field
          name="mode"
          listeners={{ onChange: ({ value }) => input.setMode(value) }}
        >
          {(field) => (
            <Field orientation="horizontal" className="w-auto">
              <FieldLabel htmlFor={modeId} className="flex-none!">
                Mode
              </FieldLabel>
              <Select
                name={field.name}
                items={MODES}
                value={field.state.value}
                onValueChange={(value) => {
                  if (value) field.handleChange(value);
                }}
              >
                <SelectTrigger id={modeId} className="min-w-[120px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                {/* A focused trigger swallows pad shortcuts, so a pointer pick
                    lets go of it; keyboard users keep their place. */}
                <SelectContent
                  finalFocus={(closeType) => closeType === "keyboard"}
                >
                  {MODES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>
      </form>
    </fieldset>
  );
};
