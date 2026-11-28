"use client";

import { ChangeEvent, FC, useEffect, useState } from "react";

import { MidiConnect } from "@/components/Sampler/MidiConnect";
import { Pad } from "@/components/Sampler/Pad";
import { SettingsSheet } from "@/components/Sampler/Settings";
import {
  useSettingsForm,
  useValidSection,
} from "@/components/Sampler/Settings/form";
import { Goniometer } from "@/components/Visualizers/Goniometer";
import { VUMeter } from "@/components/Visualizers/VUMeter";
import { AudioEngineContext } from "@/lib/audio/context";
import { getMidi } from "@/lib/midi/browser";
import { SAMPLES } from "@/samples";

import { midiAction, MPD_PADS, velocityLevel } from "./midi";
import { getSampler } from "./sampler";
import { PAD_KEYS, shortcutAction } from "./shortcut";

export const SandboxClient: FC = () => {
  const { engine, inputs, pulses, hit } = getSampler();
  const [volume, setVolume] = useState(1);

  const form = useSettingsForm();
  const engineConfig = useValidSection(form, "engine");
  const goniometerConfig = useValidSection(form, "goniometer");
  const vuConfig = useValidSection(form, "vu");
  useEffect(() => engine.configure(engineConfig), [engine, engineConfig]);
  // Also on mount: the engine still has the volume of the previous visit.
  useEffect(() => engine.setVolume(volume), [engine, volume]);

  useEffect(() => {
    engine.resume();
    return () => engine.suspend();
  }, [engine]);

  useEffect(() => {
    // The engine's AudioContext starts running here, inside a user gesture.
    const onKeyDown = (event: KeyboardEvent) => {
      const action = shortcutAction(event);
      if (action?.type === "trigger") hit(action.pad);
      else if (action?.type === "stop") engine.stopAll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine, hit]);

  // Unlike keys, MIDI pads are heard whatever has the focus, and with the
  // tab in the background. Nothing arrives until the user grants access.
  useEffect(
    () =>
      getMidi().onMessage((data) => {
        const action = midiAction(data);
        if (action) hit(action.pad, velocityLevel(action.velocity));
      }),
    [hit],
  );

  const changeVolume = (event: ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(event.target.value));
  };

  return (
    <AudioEngineContext value={engine}>
      <main className="flex flex-col gap-6 p-6 font-helevtica">
        {/* Four columns, so that the pads sit like their keys do. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {inputs.map((input, index) => (
            <Pad
              key={PAD_KEYS[index]}
              input={input}
              shortcut={PAD_KEYS[index]}
              midiPad={MPD_PADS[index].number}
              pulse={pulses[index]}
              sample={SAMPLES[index]}
              onHit={() => hit(index)}
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
          <MidiConnect />
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
