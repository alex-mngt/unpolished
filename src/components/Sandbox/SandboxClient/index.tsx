"use client";

import { ChangeEvent, FC, useEffect, useRef, useState } from "react";

import { Button } from "@/components/UI/Button";
import { Goniometer } from "@/components/Visualizers/Goniometer";
import { AudioEngineContext } from "@/lib/audio/context";
import { AudioEngine, TestPreset } from "@/lib/audio/engine";

type Source = "file" | "test";

const PRESETS: { value: TestPreset; label: string }[] = [
  { value: "mono", label: "Mono centre" },
  { value: "left", label: "Left only" },
  { value: "right", label: "Right only" },
];

export const SandboxClient: FC = () => {
  const [engine] = useState(() => new AudioEngine());
  const audioRef = useRef<HTMLAudioElement>(null);
  const [source, setSource] = useState<Source>("file");
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [preset, setPreset] = useState<TestPreset>("mono");
  const [toneOn, setToneOn] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    engine.resume();
    return () => engine.suspend();
  }, [engine]);

  useEffect(() => {
    if (!fileUrl) return;
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const stopTone = () => {
    engine.stopTest();
    setToneOn(false);
  };

  const selectSource = (next: Source) => {
    if (next === "test") audioRef.current?.pause();
    else stopTone();
    setSource(next);
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setFileUrl(URL.createObjectURL(file));
  };

  // The engine's AudioContext is created here, inside a user gesture.
  const onPlay = () => {
    if (!audioRef.current) return;
    engine.attachMedia(audioRef.current);
    engine.setMediaPlaying(true);
  };

  // Loading a new file stops playback without firing "pause".
  const onStopped = () => engine.setMediaPlaying(false);

  const toggleTone = () => {
    if (toneOn) return stopTone();
    engine.startTest(preset);
    setToneOn(true);
  };

  const selectPreset = (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as TestPreset;
    setPreset(next);
    engine.setTestPreset(next);
  };

  const changeVolume = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    setVolume(next);
    engine.setVolume(next);
  };

  return (
    <AudioEngineContext value={engine}>
      <main className="flex flex-col gap-6 p-6 max-w-xl">
        <fieldset className="flex gap-4">
          <legend className="sr-only">Audio source</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="source"
              checked={source === "file"}
              onChange={() => selectSource("file")}
            />
            Audio file
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="source"
              checked={source === "test"}
              onChange={() => selectSource("test")}
            />
            Test tone
          </label>
        </fieldset>

        {/* Kept mounted in both modes: an element can only be attached once. */}
        <div className={source === "file" ? "flex flex-col gap-3" : "hidden"}>
          <input type="file" accept="audio/*" onChange={selectFile} />
          <audio
            ref={audioRef}
            src={fileUrl ?? undefined}
            controls
            onPlay={onPlay}
            onPause={onStopped}
            onEnded={onStopped}
            onEmptied={onStopped}
            onError={onStopped}
          />
        </div>

        {source === "test" && (
          <div className="flex items-center gap-3">
            <Button onClick={toggleTone}>{toneOn ? "Stop" : "Start"}</Button>
            <select
              aria-label="Test preset"
              value={preset}
              onChange={selectPreset}
              className="border border-foreground rounded-xs py-2 px-3 bg-background"
            >
              {PRESETS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

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
      </main>
    </AudioEngineContext>
  );
};
