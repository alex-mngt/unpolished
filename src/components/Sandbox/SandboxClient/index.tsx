"use client";

import { ChangeEvent, FC, useEffect, useState } from "react";

import { Goniometer } from "@/components/Visualizers/Goniometer";
import { VUMeter } from "@/components/Visualizers/VUMeter";
import { AudioEngineContext } from "@/lib/audio/context";
import { AudioEngine } from "@/lib/audio/engine";
import { SAMPLES } from "@/samples";

import { PAD_KEYS, shortcutAction } from "./shortcut";
import { Pad } from "@/components/Sampler/Pad";

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
        <div className="flex items-center justify-evenly gap-6">
          <Goniometer className="w-1/2 max-w-md" />
          <div className="flex flex-col gap-3 w-1/2 max-w-md">
            <VUMeter channel="left" referenceDbfs={-8} />
            <VUMeter channel="right" referenceDbfs={-8} />
          </div>
        </div>
      </main>
    </AudioEngineContext>
  );
};
