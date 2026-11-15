"use client";

import { ChangeEvent, FC, useEffect, useState } from "react";

import { Pad } from "@/components/Sampler/Pad";
import { SettingsSheet } from "@/components/Sampler/Settings";
import {
  useSettingsForm,
  useValidSection,
} from "@/components/Sampler/Settings/form";
import { DEFAULT_SETTINGS } from "@/components/Sampler/Settings/schema";
import { Goniometer } from "@/components/Visualizers/Goniometer";
import { VUMeter } from "@/components/Visualizers/VUMeter";
import { AudioEngineContext } from "@/lib/audio/context";
import { AudioEngine } from "@/lib/audio/engine";
import { SAMPLES } from "@/samples";

import { PAD_KEYS, shortcutAction } from "./shortcut";

export const SandboxClient: FC = () => {
  const [{ engine, inputs }] = useState(() => {
    const engine = new AudioEngine(DEFAULT_SETTINGS.engine);
    return { engine, inputs: PAD_KEYS.map(() => engine.createInput()) };
  });
  const [volume, setVolume] = useState(1);

  const form = useSettingsForm();
  const engineConfig = useValidSection(form, "engine");
  const goniometerConfig = useValidSection(form, "goniometer");
  const vuConfig = useValidSection(form, "vu");
  useEffect(() => engine.configure(engineConfig), [engine, engineConfig]);

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

        <div className="flex items-center gap-3">
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
          <SettingsSheet form={form} />
        </div>
        <div className="flex items-center justify-evenly gap-6">
          <Goniometer config={goniometerConfig} className="w-1/2 max-w-md" />
          <div className="flex flex-col gap-3 w-1/2 max-w-md">
            <VUMeter channel="left" config={vuConfig} />
            <VUMeter channel="right" config={vuConfig} />
          </div>
        </div>
      </main>
    </AudioEngineContext>
  );
};
