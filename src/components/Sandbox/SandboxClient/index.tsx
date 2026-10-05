"use client";

import { ChangeEvent, FC, useEffect, useRef, useState } from "react";

import { Goniometer } from "@/components/Visualizers/Goniometer";
import { VUMeter } from "@/components/Visualizers/VUMeter";
import { AudioEngineContext } from "@/lib/audio/context";
import { AudioEngine, AudioInput, InputMode } from "@/lib/audio/engine";
import { Sample, SAMPLES } from "@/samples";

import { PAD_KEYS, shortcutAction } from "./shortcut";

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

const Pad: FC<PadProps> = ({ input, shortcut, sample }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(sample !== undefined);
  const [error, setError] = useState<string | null>(null);
  const [gain, setGain] = useState(1);
  const [mode, setMode] = useState<InputMode>("mono");
  const requests = useRef(0);

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

  const changeGain = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setGain(next);
    input.setGain(next);
  };

  const selectMode = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as InputMode;
    setMode(next);
    input.setMode(next);
    // A focused select keeps every key press, shortcuts included.
    event.target.blur();
  };

  const key = shortcut.toUpperCase();

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
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-1 items-center gap-3 min-w-0">
          Gain
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={gain}
            onChange={changeGain}
            className="flex-1 min-w-0"
          />
        </label>
        <select
          aria-label={`Mode of pad ${key}`}
          value={mode}
          onChange={selectMode}
          className="border border-foreground rounded-xs py-2 px-3 bg-background"
        >
          {MODES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
};

export const SandboxClient: FC = () => {
  const [{ engine, inputs }] = useState(() => {
    const engine = new AudioEngine();
    return { engine, inputs: PAD_KEYS.map(() => engine.createInput()) };
  });
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    engine.resume();
    return () => engine.suspend();
  }, [engine]);

  useEffect(() => {
    // The engine's AudioContext starts running here, inside a user gesture.
    const onKeyDown = (event: KeyboardEvent) => {
      const action = shortcutAction(event);
      if (action?.type === "trigger") inputs[action.pad]?.trigger();
      else if (action?.type === "stop") engine.stopAll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine, inputs]);

  const changeVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setVolume(next);
    engine.setVolume(next);
  };

  return (
    <AudioEngineContext value={engine}>
      <main className="flex flex-col gap-6 p-6">
        {/* Four columns, so that the pads sit like their keys do. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {inputs.map((input, index) => (
            <Pad
              key={PAD_KEYS[index]}
              input={input}
              shortcut={PAD_KEYS[index]}
              sample={SAMPLES[index]}
            />
          ))}
        </div>

        <p>
          Press <kbd>Esc</kbd> to stop everything
        </p>

        <label className="flex items-center gap-3">
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={changeVolume}
          />
        </label>

        <Goniometer className="w-full max-w-md" />
        <div className="flex flex-col gap-3 w-full max-w-md">
          <VUMeter channel="left" referenceDbfs={-8} />
          <VUMeter channel="right" referenceDbfs={-8} />
        </div>
      </main>
    </AudioEngineContext>
  );
};
